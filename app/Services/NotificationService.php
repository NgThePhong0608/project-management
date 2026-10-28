<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Project;
use App\Models\User;
use App\Notifications\CommentNotification;
use Illuminate\Support\Collection;

class NotificationService
{
    public function sendCommentNotifications(Comment $comment): void
    {
        $author = $comment->user_id;
        $mentioned = $comment->mentions()->with('user')->get()->pluck('user')->filter()
            ->reject(fn (User $u) => $u->id === $author)->unique('id');

        foreach ($mentioned as $user) {
            $user->notify(new CommentNotification($comment, CommentNotification::MENTIONED));
        }

        $skip = $mentioned->pluck('id')->push($author);

        $this->participants($comment)
            ->reject(fn (User $u) => $skip->contains($u->id))
            ->each(fn (User $u) => $u->notify(new CommentNotification($comment, CommentNotification::NEW_COMMENT)));
    }

    /**
     * @return Collection<int, User>
     */
    protected function participants(Comment $comment): Collection
    {
        $target = $comment->commentable;
        if (! $target) {
            return collect();
        }

        if ($target instanceof Project) {
            $project = $target;
            $users = collect([$project->createdBy]);
        } else {
            $project = $target->project;
            $users = collect([$target->assignedUser, $target->createdBy]);
        }

        return $users->merge($project->members)->filter()->unique('id')->values();
    }
}
