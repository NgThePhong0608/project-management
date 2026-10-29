<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

        $comment = $this->comments->createComment(
            $request->user(),
            $commentable,
            $data['body'],
            $data['parent_id'] ?? null,
        );

        if ($request->wantsJson()) {
            $comment->load('user', 'mentions.user');

            return response()->json([
                'comment' => (new CommentResource($comment))->resolve(),
            ], 201);
        }

        return back()->with('success', 'Comment added.');
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $uploadedFile = $request->file('file') ?? $request->file('image');
        $mime = (string) $uploadedFile?->getMimeType();
        $isVideo = str_starts_with($mime, 'video/');
        $fieldKey = $request->hasFile('file') ? 'file' : 'image';

        $rules = [
            'commentable_type' => ['required', Rule::in(['project', 'task'])],
            'commentable_id' => ['required', 'integer'],
            $fieldKey => $isVideo
                ? ['required', 'file', 'mimes:mp4,webm,ogg,mov,qt', 'max:10240']
                : ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ];

        $messages = [
            "{$fieldKey}.max" => $isVideo
                ? 'Video size must not exceed 10MB.'
                : 'Image size must not exceed 2MB.',
        ];

        $data = $request->validate($rules, $messages);

        $commentable = $data['commentable_type'] === 'project'
            ? Project::findOrFail($data['commentable_id'])
            : Task::findOrFail($data['commentable_id']);

        $this->authorize('view', $commentable);

        $file = $request->file($fieldKey);
        $origName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: ($isVideo ? 'mp4' : 'png'));
        if ($ext === 'qt') {
            $ext = 'mov';
        }
        $safeName = (Str::slug($origName) ?: ($isVideo ? 'video' : 'image')).'.'.$ext;
        $folder = sprintf(
            'comment/%s_%d_u%d_%s',
            $data['commentable_type'],
            (int) $commentable->id,
            (int) $request->user()->id,
            Str::random(16)
        );
        $path = $file->storeAs($folder, $safeName);
        $icon = $isVideo ? '🎬' : '📎';

        return response()->json([
            'path' => $path,
            'name' => $safeName,
            'media_type' => $isVideo ? 'video' : 'image',
            'token' => "{$icon} [{$safeName}](attachment:{$path})",
        ]);
    }

    public function attachmentUrl(Request $request): JsonResponse
    {
        $data = $request->validate([
            'commentable_type' => ['required', Rule::in(['project', 'task'])],
            'commentable_id' => ['required', 'integer'],
            'path' => ['required', 'string', 'max:500', 'regex:/^(comment|task)\/[A-Za-z0-9_\-]+\/[A-Za-z0-9._\-]+$/'],
        ]);

        $path = $data['path'];
        $owningTarget = $this->resolveAndVerifyAttachmentTarget(
            $path,
            $data['commentable_type'],
            (int) $data['commentable_id']
        );

        $this->authorize('view', $owningTarget);

        if (! Storage::exists($path)) {
            abort(404, 'Attachment not found.');
        }

        $expiresAt = now()->addMinutes(5);
        try {
            $url = Storage::temporaryUrl($path, $expiresAt);
        } catch (\Throwable) {
            $url = Storage::url($path);
        }

        $isVideo = (bool) preg_match('/\.(mp4|webm|ogg|mov)$/i', $path);

        return response()->json([
            'url' => $url,
            'name' => basename($path),
            'media_type' => $isVideo ? 'video' : 'image',
            'expires_at' => $expiresAt->toIso8601String(),
            'expires_in_seconds' => 300,
        ]);
    }

    public function destroy(Request $request, Comment $comment)
    {
        $this->authorize('delete', $comment);

        $deletingComments = collect([$comment])
            ->merge(Comment::where('parent_id', $comment->id)->get());
        $deletingIds = $deletingComments->pluck('id')->all();

        foreach ($deletingComments as $item) {
            if (! preg_match_all('/\(attachment:(comment\/[A-Za-z0-9_\-]+\/[A-Za-z0-9._\-]+)\)/', (string) $item->body, $matches)) {
                continue;
            }

            $expectedType = class_basename($item->commentable_type) === 'Project' ? 'project' : 'task';

            foreach (array_unique($matches[1]) as $path) {
                if (! $this->isAttachmentOwnedByComment($path, $expectedType, (int) $item->commentable_id, (int) $item->user_id)) {
                    continue;
                }

                $stillReferenced = Comment::whereNotIn('id', $deletingIds)
                    ->where('body', 'like', "%(attachment:{$path})%")
                    ->exists();

                if (! $stillReferenced) {
                    Storage::deleteDirectory(dirname($path));
                }
            }
        }

        $comment->delete();

        if ($request->wantsJson()) {
            return response()->noContent();
        }

        return back()->with('success', 'Comment deleted.');
    }

    private function resolveAndVerifyAttachmentTarget(string $path, string $suppliedType, int $suppliedId): Project|Task
    {
        if (preg_match('/^comment\/(project|task)_(\d+)_u(\d+)_[A-Za-z0-9]+\/[A-Za-z0-9._\-]+$/', $path, $m)) {
            $ownerType = $m[1];
            $ownerId = (int) $m[2];

            if ($suppliedType !== $ownerType || $suppliedId !== $ownerId) {
                abort(403, 'Attachment does not belong to the specified target.');
            }

            return $ownerType === 'project'
                ? Project::findOrFail($ownerId)
                : Task::findOrFail($ownerId);
        }

        $target = $suppliedType === 'project'
            ? Project::findOrFail($suppliedId)
            : Task::findOrFail($suppliedId);

        if (str_starts_with($path, 'task/')) {
            if (! ($target instanceof Task)) {
                abort(403, 'Task attachment cannot be accessed via a project target.');
            }

            $belongsToTask = $target->image_path === $path
                || $target->comments()->where('body', 'like', "%(attachment:{$path})%")->exists();

            if (! $belongsToTask) {
                abort(403, 'Attachment does not belong to this task.');
            }

            return $target;
        }

        if (! $target->comments()->where('body', 'like', "%(attachment:{$path})%")->exists()) {
            abort(403, 'Attachment does not belong to this target.');
        }

        return $target;
    }

    private function isAttachmentOwnedByComment(string $path, string $expectedType, int $expectedTargetId, int $commentAuthorId): bool
    {
        if (preg_match('/^comment\/(project|task)_(\d+)_u(\d+)_[A-Za-z0-9]+\/[A-Za-z0-9._\-]+$/', $path, $m)) {
            return $m[1] === $expectedType
                && (int) $m[2] === $expectedTargetId
                && (int) $m[3] === $commentAuthorId;
        }

        return false;
    }
}
