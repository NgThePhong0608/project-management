<?php

namespace Tests\Feature;

use App\Events\CommentCreated;
use App\Jobs\SendCommentNotifications;
use App\Models\Comment;
use App\Models\CommentMention;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\CommentNotification;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CommentAndMentionNotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $member;

    private User $outsider;

    private Project $project;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->author = User::factory()->create(['role' => 'member']);
        $this->member = User::factory()->create(['role' => 'member']);
        $this->outsider = User::factory()->create(['role' => 'member']);
        $owner = User::factory()->create(['role' => 'manager']);
        $this->project = Project::factory()->create(['created_by' => $owner->id, 'updated_by' => $owner->id]);
        $this->project->members()->attach([$this->author->id, $this->member->id]);
        $this->task = Task::factory()->create([
            'project_id' => $this->project->id, 'created_by' => $owner->id,
            'updated_by' => $owner->id, 'assigned_user_id' => $this->member->id,
        ]);
    }

    public function test_comment_with_mentions_is_stored_and_job_dispatched(): void
    {
        Queue::fake();

        $body = "Hi @[{$this->member->name}]({$this->member->id}) and @[Out]({$this->outsider->id}) and @[Me]({$this->author->id})";
        $this->actingAs($this->author)->post(route('comments.store'), [
            'commentable_type' => 'task', 'commentable_id' => $this->task->id, 'body' => $body,
        ])->assertRedirect();

        $comment = Comment::first();
        $this->assertSame($this->author->id, $comment->user_id);
        $this->assertEquals([$this->member->id], $comment->mentions()->pluck('user_id')->all());
        Queue::assertPushed(SendCommentNotifications::class, fn ($j) => $j->commentId === $comment->id);
    }

    public function test_email_mention_and_reply(): void
    {
        Queue::fake();
        $parent = $this->project->comments()->create(['user_id' => $this->member->id, 'body' => 'root']);

        $this->actingAs($this->author)->post(route('comments.store'), [
            'commentable_type' => 'project', 'commentable_id' => $this->project->id,
            'body' => "ping @{$this->member->email}", 'parent_id' => $parent->id,
        ])->assertRedirect();

        $reply = Comment::where('parent_id', $parent->id)->first();
        $this->assertEquals([$this->member->id], $reply->mentions()->pluck('user_id')->all());
    }

    public function test_outsider_cannot_comment_and_validation_applies(): void
    {
        $this->actingAs($this->outsider)->post(route('comments.store'), [
            'commentable_type' => 'task', 'commentable_id' => $this->task->id, 'body' => 'x',
        ])->assertForbidden();

        $this->actingAs($this->author)->post(route('comments.store'), [
            'commentable_type' => 'foo', 'commentable_id' => 1, 'body' => '',
        ])->assertSessionHasErrors(['commentable_type', 'body']);
        $this->assertSame(0, Comment::count());
    }

    public function test_only_author_manager_or_admin_can_delete(): void
    {
        $c = $this->task->comments()->create(['user_id' => $this->author->id, 'body' => 'mine']);

        $this->actingAs($this->member)->delete(route('comments.destroy', $c))->assertForbidden();
        $this->actingAs($this->author)->delete(route('comments.destroy', $c))->assertRedirect();
        $this->assertSame(0, Comment::count());
    }

    public function test_notifications_go_to_right_recipients_without_duplicates(): void
    {
        Notification::fake();
        Event::fake([CommentCreated::class]);

        // author comments on task; member (assignee + project member) is mentioned; owner is participant
        $this->actingAs($this->author)->post(route('comments.store'), [
            'commentable_type' => 'task', 'commentable_id' => $this->task->id,
            'body' => "hey @[x]({$this->member->id})",
        ])->assertRedirect();

        Notification::assertSentTo($this->member, CommentNotification::class,
            fn ($n) => $n->mentionType === 'mentioned');
        Notification::assertSentToTimes($this->member, CommentNotification::class, 1);
        Notification::assertNotSentTo($this->author, CommentNotification::class);
        Notification::assertNotSentTo($this->outsider, CommentNotification::class);
        Notification::assertSentTo($this->task->createdBy, CommentNotification::class,
            fn ($n) => $n->mentionType === 'new_comment');
        Event::assertDispatched(CommentCreated::class);
    }

    public function test_notification_payload_and_redirect(): void
    {
        $comment = $this->project->comments()->create(['user_id' => $this->author->id, 'body' => 'yo']);
        $this->member->notify(new CommentNotification($comment, 'new_comment'));

        $n = $this->member->notifications()->first();
        $this->assertSame('/project/'.$this->project->id, $n->data['target_url']);
        $this->assertSame('new_comment', $n->data['mention_type']);

        $this->actingAs($this->member)->get(route('notifications.show', $n->id))
            ->assertRedirect('/project/'.$this->project->id);
    }

    public function test_removed_member_does_not_receive_broadcast_channels_or_notifications(): void
    {
        Notification::fake();

        // Remove member from project
        $this->project->members()->detach($this->member->id);

        $comment = $this->task->comments()->create([
            'user_id' => $this->author->id,
            'body' => 'secret update',
        ]);

        $event = new CommentCreated($comment);
        $channelNames = array_map(fn ($ch) => $ch->name, $event->broadcastOn());

        $this->assertContains("private-App.Models.User.{$this->author->id}", $channelNames);
        $this->assertContains("private-App.Models.User.{$this->project->created_by}", $channelNames);
        $this->assertNotContains("private-App.Models.User.{$this->member->id}", $channelNames);
        $this->assertNotContains("private-App.Models.User.{$this->outsider->id}", $channelNames);
    }

    public function test_unmembered_assignee_does_not_receive_comment_notifications(): void
    {
        Notification::fake();
        Event::fake([CommentCreated::class]);

        // Assign task to outsider who is NOT a member of the project
        $this->task->update(['assigned_user_id' => $this->outsider->id]);

        $this->actingAs($this->author)->post(route('comments.store'), [
            'commentable_type' => 'task',
            'commentable_id' => $this->task->id,
            'body' => 'internal discussion',
        ])->assertRedirect();

        Notification::assertNotSentTo($this->outsider, CommentNotification::class);

        // Even if a notification was queued before member removal, via() drops delivery once access is revoked
        $comment = Comment::first();
        $notification = new CommentNotification($comment, 'new_comment');
        $this->assertSame([], $notification->via($this->outsider));

        $this->project->members()->detach($this->member->id);
        $this->assertSame([], $notification->via($this->member));
    }

    public function test_deleting_task_or_project_cleans_up_comments_and_mentions_and_pending_jobs_noop(): void
    {
        $taskComment = $this->task->comments()->create([
            'user_id' => $this->author->id,
            'body' => 'task comment',
        ]);
        CommentMention::create(['comment_id' => $taskComment->id, 'user_id' => $this->member->id]);

        $secondTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'created_by' => $this->project->created_by,
            'updated_by' => $this->project->created_by,
        ]);
        $secondTaskComment = $secondTask->comments()->create([
            'user_id' => $this->author->id,
            'body' => 'second task comment',
        ]);
        CommentMention::create(['comment_id' => $secondTaskComment->id, 'user_id' => $this->member->id]);

        $projectComment = $this->project->comments()->create([
            'user_id' => $this->author->id,
            'body' => 'project comment',
        ]);
        CommentMention::create(['comment_id' => $projectComment->id, 'user_id' => $this->member->id]);

        // Deleting a single task removes its comments and mentions
        $this->task->delete();
        $this->assertDatabaseMissing('comments', ['id' => $taskComment->id]);
        $this->assertDatabaseMissing('comment_mentions', ['comment_id' => $taskComment->id]);

        // Deleting the project removes project comments AND cascaded tasks' comments & mentions
        $this->project->delete();
        $this->assertDatabaseMissing('comments', ['id' => $secondTaskComment->id]);
        $this->assertDatabaseMissing('comment_mentions', ['comment_id' => $secondTaskComment->id]);
        $this->assertDatabaseMissing('comments', ['id' => $projectComment->id]);
        $this->assertDatabaseMissing('comment_mentions', ['comment_id' => $projectComment->id]);

        // Pending job for deleted comment safely no-ops without throwing
        $job = new SendCommentNotifications($projectComment->id);
        $job->handle(app(NotificationService::class));
        $this->assertSame(0, Comment::count());
    }

    public function test_broadcast_payload_stays_under_reverb_limit_for_huge_comment(): void
    {
        $huge = str_repeat('😀', 5000);
        $comment = $this->task->comments()->create(['user_id' => $this->author->id, 'body' => $huge]);
        $payload = (new CommentCreated($comment))->broadcastWith();

        $this->assertTrue($payload['comment']['truncated']);
        $this->assertSame($comment->id, $payload['comment']['id']);
        $this->assertLessThan(10000, strlen(json_encode(json_encode($payload))));

        $small = $this->task->comments()->create(['user_id' => $this->author->id, 'body' => 'hi']);
        $this->assertSame('hi', (new CommentCreated($small))->broadcastWith()['comment']['body']);
    }

    public function test_no_delivery_to_user_who_lost_access_after_dispatch(): void
    {
        $comment = $this->task->comments()->create(['user_id' => $this->author->id, 'body' => 'secret']);
        $notification = new CommentNotification($comment, 'new_comment');

        $this->assertSame(['database', 'mail', 'broadcast'], $notification->via($this->member));

        // Removed from the project while still the task's assignee.
        $this->project->members()->detach($this->member->id);
        $this->assertSame([], $notification->via($this->member));

        // Assignee who was never a member (task assignment accepts any user).
        $this->assertSame([], $notification->via($this->outsider));

        $this->member->notify($notification);
        $this->assertSame(0, $this->member->notifications()->count());
    }
}
