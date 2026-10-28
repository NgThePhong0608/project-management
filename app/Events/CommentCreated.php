<?php

namespace App\Events;

use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Project;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Comment $comment) {}

    public function broadcastOn(): PrivateChannel
    {
        $prefix = $this->comment->commentable_type === Project::class ? 'project' : 'task';

        return new PrivateChannel("{$prefix}.{$this->comment->commentable_id}");
    }

    public function broadcastAs(): string
    {
        return 'comment.created';
    }

    public function broadcastWith(): array
    {
        $this->comment->loadMissing('user', 'mentions.user');

        return ['comment' => (new CommentResource($this->comment))->resolve()];
    }
}
