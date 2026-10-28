<?php

namespace App\Notifications;

use App\Services\AwsNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Container\Container;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected ?AwsNotificationService $awsNotificationService = null;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $changedAt = '',
        ?AwsNotificationService $awsNotificationService = null
    ) {
        $this->changedAt = $this->changedAt ?: now()->toDateTimeString();
        $this->awsNotificationService = $awsNotificationService ?? Container::getInstance()->make(AwsNotificationService::class);
    }

    /**
     * Prepare the instance values for serialization.
     *
     * @return array<string, mixed>
     */
    public function __serialize(): array
    {
        $service = $this->awsNotificationService;
        $this->awsNotificationService = null;

        try {
            return parent::__serialize();
        } finally {
            $this->awsNotificationService = $service;
        }
    }

    /**
     * Restore the instance values after deserialization in queue worker.
     *
     * @param  array<string, mixed>  $data
     */
    public function __unserialize(array $data): void
    {
        parent::__unserialize($data);
        $this->awsNotificationService = Container::getInstance()->make(AwsNotificationService::class);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $this->awsNotificationService?->logToCloudWatch('PASSWORD_CHANGED_NOTIFICATION', [
            'user_id' => $notifiable->id ?? null,
            'email' => $notifiable->email ?? null,
            'changed_at' => $this->changedAt,
            'status' => 'DISPATCHED_TO_SMTP',
        ]);

        return (new MailMessage)
            ->subject('['.config('app.name').'] Your Password Has Been Changed')
            ->markdown('emails.password-changed', [
                'user' => $notifiable,
                'changedAt' => $this->changedAt,
                'loginUrl' => route('login'),
            ]);
    }

    /**
     * Get the array representation of the notification for in-app database storage.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'security',
            'title' => 'Password Changed',
            'task_name' => 'Security Alert: Password Updated',
            'project_name' => 'Account Security',
            'changed_at' => $this->changedAt,
            'message' => "Your account password was successfully updated at {$this->changedAt}.",
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $array = $this->toArray($notifiable);

        return new BroadcastMessage([
            ...$array,
            'data' => $array,
            'read_at' => null,
            'created_at' => now()->toIso8601String(),
        ]);
    }
}
