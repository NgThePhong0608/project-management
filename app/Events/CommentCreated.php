<?php

namespace App\Events;

use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Gate;

class CommentCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Max encoded payload size. Reverb rejects broadcast requests above 10,000 bytes
     * (config/reverb.php max_request_size); keep headroom for the envelope.
     */
    public const MAX_PAYLOAD_BYTES = 8000;

    public function __construct(public Comment $comment) {}

    /**
     * Deliver comment only to per-user channels of users currently authorized to view the target.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $target = $this->comment->commentable;
        if (! $target) {
            return [];
        }

        $project = $target instanceof Project ? $target : $target->project;
        if (! $project) {
            return [];
        }

        $candidates = $project->members()
            ->get()
            ->push($project->createdBy)
            ->merge(User::where('role', 'admin')->get())
            ->filter()
            ->unique('id');

        return $candidates
            ->filter(fn (User $user) => Gate::forUser($user)->allows('view', $target))
            ->map(fn (User $user) => new PrivateChannel("App.Models.User.{$user->id}"))
            ->values()
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'comment.created';
    }

    public function broadcastWith(): array
    {
        $this->comment->loadMissing('user', 'mentions.user');

        $payload = ['comment' => (new CommentResource($this->comment))->resolve()];

        // The payload is JSON-encoded again inside the broadcast envelope, so measure it double-encoded.
        if (strlen(json_encode(json_encode($payload))) <= self::MAX_PAYLOAD_BYTES) {
            return $payload;
        }

        // Too large to push: send a reference and let clients reload comments.
        return ['comment' => [
            'id' => $this->comment->id,
            'commentable_type' => (new CommentResource($this->comment))->resolve()['commentable_type'],
            'commentable_id' => $this->comment->commentable_id,
            'truncated' => true,
        ]];
    }
}
