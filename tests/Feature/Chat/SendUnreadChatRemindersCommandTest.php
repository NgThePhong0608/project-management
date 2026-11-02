<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\User;
use App\Notifications\UnreadChatReminderNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SendUnreadChatRemindersCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_notifies_users_with_unread_messages(): void
    {
        Notification::fake();

        $userWithUnread = User::factory()->create();
        $userAllRead = User::factory()->create();

        $conv = Conversation::create(['type' => 'group', 'name' => 'Design Sprint']);
        $conv->users()->attach([
            $userWithUnread->id => ['unread_count' => 4],
            $userAllRead->id => ['unread_count' => 0],
        ]);

        $this->artisan('chat:send-unread-reminders')
            ->expectsOutputToContain('Sent unread chat reminders to 1 user(s).')
            ->assertExitCode(0);

        Notification::assertSentTo(
            $userWithUnread,
            UnreadChatReminderNotification::class,
            function ($notification) {
                return $notification->totalUnread === 4 && $notification->conversationCount === 1;
            }
        );

        Notification::assertNotSentTo($userAllRead, UnreadChatReminderNotification::class);
    }

    public function test_command_handles_multiple_conversations_including_direct_chat(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $group = Conversation::create(['type' => 'group', 'name' => 'Backend Team']);
        $direct = Conversation::create(['type' => 'direct', 'name' => null]);

        $group->users()->attach([$user->id => ['unread_count' => 3]]);
        $direct->users()->attach([$user->id => ['unread_count' => 2]]);

        $this->artisan('chat:send-unread-reminders')
            ->expectsOutputToContain('Sent unread chat reminders to 1 user(s).')
            ->assertExitCode(0);

        Notification::assertSentTo(
            $user,
            UnreadChatReminderNotification::class,
            function ($notification) {
                return $notification->totalUnread === 5
                    && $notification->conversationCount === 2
                    && in_array('Backend Team', $notification->sampleConversationNames, true)
                    && in_array('Direct Chat', $notification->sampleConversationNames, true);
            }
        );
    }

    public function test_unread_chat_reminder_notification_mail_and_array_payload(): void
    {
        $user = User::factory()->create(['name' => 'John Doe']);
        $notification = new UnreadChatReminderNotification(
            totalUnread: 5,
            conversationCount: 2,
            sampleConversationNames: ['Backend Team', 'Direct Chat']
        );

        $this->assertEquals(['database', 'mail'], $notification->via($user));

        $mail = $notification->toMail($user);
        $this->assertEquals('You have 5 unread chat messages', $mail->subject);
        $this->assertEquals('Hello John Doe,', $mail->greeting);
        $this->assertStringContainsString('5 unread message(s) across 2 conversation(s)', implode(' ', $mail->introLines));
        $this->assertStringContainsString('Conversations: Backend Team, Direct Chat.', implode(' ', $mail->introLines));
        $this->assertEquals('Open Chat', $mail->actionText);
        $this->assertEquals(url('/chat'), $mail->actionUrl);

        $array = $notification->toArray($user);
        $this->assertEquals('chat_unread_reminder', $array['type']);
        $this->assertEquals(5, $array['total_unread']);
        $this->assertEquals(2, $array['conversation_count']);
        $this->assertEquals('/chat', $array['target_url']);
    }

    public function test_schedule_registers_chat_send_unread_reminders(): void
    {
        $schedule = app()->make(Schedule::class);
        $events = collect($schedule->events());

        $hasCommand = $events->contains(function ($event) {
            return str_contains($event->command ?? '', 'chat:send-unread-reminders');
        });

        $this->assertTrue($hasCommand, 'Schedule should contain chat:send-unread-reminders command');
    }
}
