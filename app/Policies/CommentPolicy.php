<?php

namespace App\Policies;

use App\Models\Comment;
use App\Models\User;

class CommentPolicy
{
    /**
     * Admin is handled via Gate::before. Author or global manager may delete,
     * as long as they can still view the commentable.
     */
    public function delete(User $user, Comment $comment): bool
    {
        return ($comment->user_id === $user->id || $user->hasRole('manager'))
            && $user->can('view', $comment->commentable);
    }
}
