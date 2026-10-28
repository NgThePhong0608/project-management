<?php

namespace App\Services;

use App\Events\CommentCreated;
use App\Jobs\SendCommentNotifications;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CommentService
{
    public function __construct(protected MentionService $mentions) {}

    public function createComment(User $author, Model $commentable, string $body, ?int $parentId = null): Comment
    {
        return DB::transaction(function () use ($author, $commentable, $body, $parentId) {
            $comment = $commentable->comments()->create([
                'user_id' => $author->id,
                'parent_id' => $parentId,
                'body' => $body,
            ]);

            $this->mentions->syncMentions($comment);

            SendCommentNotifications::dispatch($comment->id)->afterCommit();
            CommentCreated::dispatch($comment);

            return $comment;
        });
    }
}
