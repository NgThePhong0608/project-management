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

        return ['comment' => (new CommentResource($this->comment))->resolve()];
    }
}
