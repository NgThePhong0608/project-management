<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UnreadChatReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, string>  $sampleConversationNames
     */
    public function __construct(
        public int $totalUnread,
        public int $conversationCount,
        public array $sampleConversationNames = []
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $convList = ! empty($this->sampleConversationNames)
            ? ' Conversations: '.implode(', ', $this->sampleConversationNames).'.'
            : '';

        return (new MailMessage)
            ->subject("You have {$this->totalUnread} unread chat messages")
            ->greeting("Hello {$notifiable->name},")
            ->line("You have {$this->totalUnread} unread message(s) across {$this->conversationCount} conversation(s).{$convList}")
            ->action('Open Chat', url('/chat'))
            ->line('Stay connected with your team on Project Management!');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'chat_unread_reminder',
            'title' => 'Unread Chat Messages',
            'total_unread' => $this->totalUnread,
            'conversation_count' => $this->conversationCount,
            'target_url' => '/chat',
            'message' => "You have {$this->totalUnread} unread message(s) waiting for you in Chat.",
        ];
    }
}
