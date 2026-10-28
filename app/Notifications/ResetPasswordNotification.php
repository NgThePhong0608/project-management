<?php

namespace App\Notifications;

use App\Services\AwsNotificationService;
use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Container\Container;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword implements ShouldQueue
{
    use Queueable;

    protected ?AwsNotificationService $awsNotificationService = null;

    /**
     * Create a notification instance.
     */
    public function __construct(
        #[\SensitiveParameter] string $token,
        ?AwsNotificationService $awsNotificationService = null
    ) {
        parent::__construct($token);
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
     * Build the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $resetUrl = $this->resetUrl($notifiable);
        $expireMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        $this->awsNotificationService?->logToCloudWatch('PASSWORD_RESET_LINK_SENT', [
            'user_id' => $notifiable->id ?? null,
            'email' => $notifiable->email ?? null,
            'expire_minutes' => $expireMinutes,
            'status' => 'DISPATCHED_TO_SMTP',
        ]);

        return (new MailMessage)
            ->subject('['.config('app.name').'] Reset Password Notification')
            ->markdown('emails.reset-password', [
                'user' => $notifiable,
                'resetUrl' => $resetUrl,
                'expireMinutes' => $expireMinutes,
            ]);
    }
}
