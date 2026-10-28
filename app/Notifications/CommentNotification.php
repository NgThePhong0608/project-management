<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CommentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const MENTIONED = 'mentioned';

    public const NEW_COMMENT = 'new_comment';

    public function __construct(public Comment $comment, public string $mentionType = self::NEW_COMMENT) {}

    public function via(object $notifiable): array
    {
        $target = $this->comment->commentable;
        if (! $target || ! Gate::forUser($notifiable)->allows('view', $target)) {
            return [];
        }

        return ['database', 'mail', 'broadcast'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->toArray($notifiable);

        return (new MailMessage)
            ->subject("[{$data['project_name']}] ".$data['title'])
            ->greeting("Hello {$notifiable->name},")
            ->line($data['message'])
            ->line('"'.Str::limit($this->comment->body, 300).'"')
            ->action('View '.($data['task_id'] ? 'Task' : 'Project'), url($data['target_url']));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $comment = $this->comment->loadMissing('user', 'commentable');
        $target = $comment->commentable;
        $isProject = $target instanceof Project;
        $project = $isProject ? $target : $target?->project;
        $authorName = $comment->user?->name ?? 'User';
        $mentioned = $this->mentionType === self::MENTIONED;
        $targetName = $target?->name ?? 'Deleted item';

        return [
            'type' => 'comment',
            'mention_type' => $this->mentionType,
            'title' => $mentioned ? 'You were mentioned' : 'New comment',
            'comment_id' => $comment->id,
            'commentable_type' => $isProject ? 'project' : 'task',
            'commentable_id' => $target?->id,
            'task_id' => $isProject ? null : $target?->id,
            'task_name' => $targetName,
            'project_id' => $project?->id,
            'project_name' => $project?->name ?? 'General',
            'author_name' => $authorName,
            'assigned_by' => $authorName,
            'message' => $mentioned
                ? "{$authorName} mentioned you in a comment on {$targetName}"
                : "{$authorName} commented on {$targetName}",
            'target_url' => $target
                ? ($isProject
                    ? route('project.show', $target->id, false)
                    : route('task.show', $target->id, false))
                : '/dashboard',
        ];
    }

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
