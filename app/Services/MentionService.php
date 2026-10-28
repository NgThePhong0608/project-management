<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;

class MentionService
{
    /**
     * Parse "@[Name](user_id)" and "@email" mentions from the comment body.
     *
     * @return Collection<int, int> unique user ids
     */
    public function parse(string $body): Collection
    {
        preg_match_all('/@\[[^\]]*\]\((\d+)\)/', $body, $byId);
        preg_match_all('/(?<![\w.])@([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/', $body, $byEmail);

        $ids = collect($byId[1])->map(fn ($id) => (int) $id);

        if ($byEmail[1]) {
            $ids = $ids->merge(User::whereIn('email', array_unique($byEmail[1]))->pluck('id'));
        }

        return $ids->unique()->values();
    }

    /**
     * Persist mentions, keeping only users who can view the commentable
     * (and excluding the author).
     *
     * @return Collection<int, User>
     */
    public function syncMentions(Comment $comment): Collection
    {
        $commentable = $comment->commentable;

        $users = User::whereIn('id', $this->parse($comment->body))
            ->where('id', '!=', $comment->user_id)
            ->get()
            ->filter(fn (User $u) => Gate::forUser($u)->allows('view', $commentable))
            ->values();

        $comment->mentions()->whereNotIn('user_id', $users->pluck('id'))->delete();
        foreach ($users as $user) {
            $comment->mentions()->firstOrCreate(['user_id' => $user->id]);
        }

        return $users;
    }
}
