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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
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

    public function test_adding_project_member_creates_activity_comment_and_sends_notification(): void
    {
        Notification::fake();
        Event::fake([CommentCreated::class]);

        $newMember = User::factory()->create(['role' => 'member', 'name' => 'Alice Tester']);

        $this->actingAs($this->project->createdBy)
            ->post(route('project.members.store', $this->project), [
                'user_ids' => [$newMember->id],
                'role' => 'member',
            ])
            ->assertRedirect();

        $this->assertSame(1, $this->project->comments()->count());
        $comment = $this->project->comments()->latest('id')->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("@[Alice Tester]({$newMember->id})", $comment->body);

        // New member is mentioned in the project comment and receives a notification exactly once
        Notification::assertSentToTimes($newMember, CommentNotification::class, 1);
        Notification::assertSentTo(
            $newMember,
            CommentNotification::class,
            fn ($n) => $n->mentionType === CommentNotification::MENTIONED
        );
        // Existing project member also receives new_comment notification
        Notification::assertSentToTimes($this->member, CommentNotification::class, 1);
        Notification::assertSentTo(
            $this->member,
            CommentNotification::class,
            fn ($n) => $n->mentionType === CommentNotification::NEW_COMMENT
        );
        Event::assertDispatchedTimes(CommentCreated::class, 1);
    }

    public function test_updating_task_and_status_creates_activity_comment_and_notifies_participants(): void
    {
        Notification::fake();
        Event::fake([CommentCreated::class]);

        $owner = $this->project->createdBy;
        $this->task->update(['status' => 'pending', 'priority' => 'low']);

        $this->actingAs($owner)
            ->put(route('task.update', $this->task), [
                'name' => $this->task->name,
                'description' => 'Updated task description',
                'status' => 'in_progress',
                'priority' => 'high',
                'due_date' => '2026-12-31',
                'project_id' => $this->project->id,
                'assigned_user_id' => $this->member->id,
            ])
            ->assertRedirect(route('task.index'));

        $this->assertSame(1, $this->task->comments()->count());
        $comment = $this->task->comments()->latest('id')->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString('Status:', $comment->body);
        $this->assertStringContainsString('`In Progress`', $comment->body);
        $this->assertStringContainsString("@[{$this->member->name}]({$this->member->id})", $comment->body);

        // Assignee is tagged via cc @[Name](id) -> receives MENTIONED notification exactly once
        Notification::assertSentToTimes($this->member, CommentNotification::class, 1);
        Notification::assertSentTo(
            $this->member,
            CommentNotification::class,
            fn ($n) => $n->mentionType === CommentNotification::MENTIONED
        );
        // Other project member receives NEW_COMMENT notification
        Notification::assertSentToTimes($this->author, CommentNotification::class, 1);
        Notification::assertSentTo(
            $this->author,
            CommentNotification::class,
            fn ($n) => $n->mentionType === CommentNotification::NEW_COMMENT
        );
        Event::assertDispatchedTimes(CommentCreated::class, 1);
    }

    public function test_updating_task_image_preserves_old_image_and_embeds_before_after_in_comment(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);
        Notification::fake();
        Event::fake([CommentCreated::class]);

        $owner = $this->project->createdBy;
        $oldPath = UploadedFile::fake()->image('old-banner.png')->storeAs('task/oldfolder', 'old-banner.png');
        $this->task->update(['image_path' => $oldPath]);

        $newImage = UploadedFile::fake()->image('new-banner.png', 200, 200);

        $this->actingAs($owner)
            ->put(route('task.update', $this->task), [
                'name' => $this->task->name,
                'description' => $this->task->description,
                'status' => $this->task->status,
                'priority' => $this->task->priority,
                'due_date' => '2026-12-31',
                'project_id' => $this->project->id,
                'assigned_user_id' => $this->member->id,
                'image' => $newImage,
            ])
            ->assertRedirect(route('task.index'));

        // Old image still exists in Storage so historical comments can generate temporary URLs for it
        Storage::disk($disk)->assertExists($oldPath);

        $comment = $this->task->comments()->latest('id')->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("📎 [old-banner.png](attachment:{$oldPath})", $comment->body);
        $this->assertStringContainsString('→ 📎 [new-banner.png](attachment:task/', $comment->body);
    }

    public function test_comment_image_upload_enforces_2mb_limit_and_generates_5m_temporary_url(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);

        // Outsider cannot upload comment image to a task they cannot view
        $this->actingAs($this->outsider)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->image('test.png')->size(500),
            ])
            ->assertForbidden();

        // Image exceeding 2MB (2048 KB) is rejected
        $this->actingAs($this->author)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->image('huge.png')->size(2500),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);

        // Valid image <= 2MB succeeds and returns attachment path + filename token
        $res = $this->actingAs($this->author)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->image('Screenshot Final.png')->size(512),
            ])
            ->assertOk()
            ->assertJsonStructure(['path', 'name', 'token']);

        $path = $res->json('path');
        $name = $res->json('name');
        $token = $res->json('token');
        $this->assertSame('screenshot-final.png', $name);

        // Outsider cannot request temporary URL for attachment
        $this->actingAs($this->outsider)
            ->getJson(route('comments.attachmentUrl', [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'path' => $path,
            ]))
            ->assertForbidden();

        // Authorized member can request 5-minute temporary URL on click
        $tempRes = $this->actingAs($this->member)
            ->getJson(route('comments.attachmentUrl', [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'path' => $path,
            ]))
            ->assertOk()
            ->assertJsonStructure(['url', 'name', 'expires_at', 'expires_in_seconds']);

        $this->assertSame(300, $tempRes->json('expires_in_seconds'));
        $this->assertSame('screenshot-final.png', $tempRes->json('name'));

        // Rich HTML comment with attachment filename token and @mention stores cleanly
        $richHtml = "<p>Check this file @[{$this->member->name}]({$this->member->id}) {$token}</p>";

        $this->actingAs($this->author)
            ->post(route('comments.store'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'body' => $richHtml,
            ])
            ->assertRedirect();

        $saved = $this->task->comments()->latest('id')->first();
        $this->assertSame($richHtml, $saved->body);
        $this->assertEquals([$this->member->id], $saved->mentions()->pluck('user_id')->all());

        // Video exceeding 10MB (10240 KB) is rejected
        $this->actingAs($this->author)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->create('huge-clip.mp4', 11000, 'video/mp4'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);

        // Valid video <= 10MB succeeds and generates video token + 5m temporary URL
        $videoRes = $this->actingAs($this->author)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->create('Demo Video.mp4', 3000, 'video/mp4'),
            ])
            ->assertOk()
            ->assertJsonPath('media_type', 'video')
            ->assertJsonPath('name', 'demo-video.mp4');

        $videoPath = $videoRes->json('path');
        $this->assertStringStartsWith('🎬 [demo-video.mp4](attachment:comment/', $videoRes->json('token'));

        $this->actingAs($this->member)
            ->getJson(route('comments.attachmentUrl', [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'path' => $videoPath,
            ]))
            ->assertOk()
            ->assertJsonPath('media_type', 'video')
            ->assertJsonPath('expires_in_seconds', 300);

        // Posting comment with JSON Accept header returns 201 without redirect and deleting comment cleans up S3 attachment
        $videoToken = $videoRes->json('token');
        $jsonCommentRes = $this->actingAs($this->author)
            ->postJson(route('comments.store'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'body' => "<p>Uploaded video {$videoToken}</p>",
            ])
            ->assertCreated()
            ->assertJsonStructure(['comment' => ['id', 'body', 'author']]);

        $createdCommentId = $jsonCommentRes->json('comment.id');
        Storage::disk($disk)->assertExists($videoPath);

        $this->actingAs($this->author)
            ->deleteJson(route('comments.destroy', $createdCommentId))
            ->assertNoContent();

        Storage::disk($disk)->assertMissing($videoPath);
    }

    public function test_attachment_cannot_be_deleted_by_copying_token_or_accessed_across_projects_after_revocation(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);

        // 1. Author uploads an attachment on $this->task and posts a comment
        $uploadRes = $this->actingAs($this->author)
            ->postJson(route('comments.uploadImage'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'image' => UploadedFile::fake()->image('author-file.png')->size(200),
            ])
            ->assertOk();

        $authorPath = $uploadRes->json('path');
        $authorToken = $uploadRes->json('token');

        $this->actingAs($this->author)
            ->postJson(route('comments.store'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'body' => "<p>Author attachment {$authorToken}</p>",
            ])
            ->assertCreated();

        // 2. Another member tries to copy Author's attachment token into their own comment -> rejected (422)
        $this->actingAs($this->member)
            ->postJson(route('comments.store'), [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'body' => "<p>Copied token {$authorToken}</p>",
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);

        // Even if a comment row in DB contains Author's token under Member's user_id, deleting Member's comment
        // must NOT delete Author's file (both ownership check and remaining-reference check protect it)
        $spoofedComment = $this->task->comments()->create([
            'user_id' => $this->member->id,
            'body' => "<p>Spoofed {$authorToken}</p>",
        ]);

        $this->actingAs($this->member)
            ->deleteJson(route('comments.destroy', $spoofedComment->id))
            ->assertNoContent();

        Storage::disk($disk)->assertExists($authorPath);

        // 3. Member loses access to $this->project, then tries to sign $authorPath using a different project they CAN view
        $otherProject = Project::factory()->create([
            'created_by' => $this->member->id,
            'updated_by' => $this->member->id,
        ]);
        $this->project->members()->detach($this->member->id);

        // Supplying $otherProject to sign $authorPath (which belongs to $this->task) is forbidden
        $this->actingAs($this->member)
            ->getJson(route('comments.attachmentUrl', [
                'commentable_type' => 'project',
                'commentable_id' => $otherProject->id,
                'path' => $authorPath,
            ]))
            ->assertForbidden();

        // Supplying the actual owning target ($this->task) after losing access is also forbidden
        $this->actingAs($this->member)
            ->getJson(route('comments.attachmentUrl', [
                'commentable_type' => 'task',
                'commentable_id' => $this->task->id,
                'path' => $authorPath,
            ]))
            ->assertForbidden();
    }
}
