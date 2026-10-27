<?php

namespace App\Notifications;

use App\Models\Task;
use App\Services\AwsNotificationService;
use DateTimeInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Container\Container;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected ?AwsNotificationService $awsNotificationService = null;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Task $task,
        public string $action = 'assigned',
        ?AwsNotificationService $awsNotificationService = null
    ) {
        $this->awsNotificationService = $awsNotificationService ?? Container::getInstance()->make(AwsNotificationService::class);
    }

    /**
     * Prepare the instance values for serialization.
     * Excludes non-serializable AWS SDK clients while preserving model identifiers.
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
        $projectName = $this->task->project?->name ?? 'General';
        $assignedBy = $this->task->updatedBy?->name ?? $this->task->createdBy?->name ?? 'Admin';
        $taskUrl = route('task.show', $this->task->id);

        $dueDate = $this->task->due_date instanceof DateTimeInterface
            ? $this->task->due_date->format('Y-m-d')
            : ($this->task->due_date ?? 'N/A');

        // Audit log notification delivery to AWS CloudWatch Logs
        $this->awsNotificationService?->logToCloudWatch('NOTIFICATION_MAIL_RENDERED', [
            'task_id' => $this->task->id,
            'task_name' => $this->task->name,
            'project_name' => $projectName,
            'assigned_to' => $notifiable->email ?? $notifiable->name ?? 'User',
            'assigned_by' => $assignedBy,
            'action' => $this->action,
            'status' => 'DISPATCHED_TO_SMTP',
        ]);

        return (new MailMessage)
            ->subject("[{$projectName}] New Task Assigned: {$this->task->name}")
            ->markdown('emails.task-assigned', [
                'user' => $notifiable,
                'task' => $this->task,
                'projectName' => $projectName,
                'assignedBy' => $assignedBy,
                'dueDate' => $dueDate,
                'taskUrl' => $taskUrl,
            ]);
    }

    /**
     * Get the array representation of the notification for in-app database storage.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $projectName = $this->task->project?->name ?? 'General';
        $assignedBy = $this->task->updatedBy?->name ?? $this->task->createdBy?->name ?? 'Admin';

        $dueDate = $this->task->due_date instanceof DateTimeInterface
            ? $this->task->due_date->format('Y-m-d')
            : ($this->task->due_date ?? null);

        return [
            'task_id' => $this->task->id,
            'task_name' => $this->task->name,
            'project_id' => $this->task->project_id,
            'project_name' => $projectName,
            'assigned_by' => $assignedBy,
            'priority' => $this->task->priority,
            'due_date' => $dueDate,
            'message' => "You have been assigned to task: {$this->task->name} ({$projectName})",
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
