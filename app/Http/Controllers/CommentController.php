<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Services\CommentService;

class CommentController extends Controller
{
    public function __construct(protected CommentService $comments) {}

    public function store(StoreCommentRequest $request)
    {
        $data = $request->validated();

        $commentable = $data['commentable_type'] === 'project'
            ? Project::findOrFail($data['commentable_id'])
            : Task::findOrFail($data['commentable_id']);

        $this->authorize('view', $commentable);

        $this->comments->createComment(
            $request->user(),
            $commentable,
            $data['body'],
            $data['parent_id'] ?? null,
        );

        return back()->with('success', 'Comment added.');
    }

    public function destroy(Comment $comment)
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return back()->with('success', 'Comment deleted.');
    }
}
