<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\PasswordChangedNotification;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_fetch_notifications_and_unread_count(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $user->id,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $user->notify(new TaskAssignedNotification($task));

        $response = $this->actingAs($user)->getJson(route('notifications.index'));

        $response->assertOk()
            ->assertJsonPath('unreadCount', 1)
            ->assertJsonCount(1, 'notifications');
    }

    public function test_user_can_mark_single_notification_as_read(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $user->id,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $user->notify(new TaskAssignedNotification($task));
        $notification = $user->unreadNotifications()->first();

        $response = $this->actingAs($user)->postJson(route('notifications.read', $notification->id));

        $response->assertOk()->assertJson(['success' => true]);
        $this->assertEquals(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_user_can_mark_all_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);
        $task1 = Task::factory()->create(['project_id' => $project->id, 'assigned_user_id' => $user->id]);
        $task2 = Task::factory()->create(['project_id' => $project->id, 'assigned_user_id' => $user->id]);

        $user->notify(new TaskAssignedNotification($task1));
        $user->notify(new TaskAssignedNotification($task2));

        $this->assertEquals(2, $user->unreadNotifications()->count());

        $response = $this->actingAs($user)->postJson(route('notifications.readAll'));

        $response->assertOk()->assertJson(['success' => true]);
        $this->assertEquals(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_task_creation_sends_notification_to_assigned_user(): void
    {
        Notification::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $assignee = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $admin->id, 'updated_by' => $admin->id]);

        $this->actingAs($admin)->post(route('task.store'), [
            'name' => 'Test Notification Task',
            'description' => 'Testing notifications',
            'status' => 'pending',
            'priority' => 'high',
            'due_date' => now()->addDays(3)->format('Y-m-d'),
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
        ]);

        Notification::assertSentTo($assignee, TaskAssignedNotification::class);
    }

    public function test_notification_includes_broadcast_channel_and_payload(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $user->id,
            'name' => 'Realtime Notification Task',
        ]);

        $notification = new TaskAssignedNotification($task);

        $channels = $notification->via($user);
        $this->assertContains('database', $channels);
        $this->assertContains('mail', $channels);
        $this->assertContains('broadcast', $channels);

        $broadcastMessage = $notification->toBroadcast($user);
        $this->assertInstanceOf(BroadcastMessage::class, $broadcastMessage);
        $this->assertEquals('Realtime Notification Task', $broadcastMessage->data['task_name']);
        $this->assertEquals($task->id, $broadcastMessage->data['task_id']);
        $this->assertArrayHasKey('data', $broadcastMessage->data);
    }

    public function test_non_task_notification_detail_page_can_be_viewed_and_marks_as_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new PasswordChangedNotification('2026-10-28 10:00:00'));

        $notification = $user->unreadNotifications()->first();
        $this->assertNotNull($notification);

        $response = $this->actingAs($user)->get(route('notifications.show', $notification->id));

        $response->assertOk();
        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_task_notification_detail_redirects_to_task_show(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);
        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $user->id,
        ]);

        $user->notify(new TaskAssignedNotification($task));
        $notification = $user->unreadNotifications()->first();

        $response = $this->actingAs($user)->get(route('notifications.show', $notification->id));

        $response->assertRedirect(route('task.show', $task->id));
        $this->assertNotNull($notification->fresh()->read_at);
    }
}
