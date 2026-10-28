<?php

namespace App\Jobs;

use App\Models\Comment;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendCommentNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $commentId) {}

    public function handle(NotificationService $notifications): void
    {
        $comment = Comment::find($this->commentId);
        if (! $comment || ! $comment->commentable) {
            return;
        }

        $notifications->sendCommentNotifications($comment);
    }
}
