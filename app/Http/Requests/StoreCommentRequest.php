<?php

namespace App\Http\Requests;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Target-level authorization is done in CommentController.
    }

    public function rules(): array
    {
        return [
            'commentable_type' => ['required', Rule::in(['project', 'task'])],
            'commentable_id' => ['required', 'integer'],
            'body' => ['required', 'string', 'max:5000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $parentId = $this->input('parent_id');
            if (! $parentId || $validator->errors()->isNotEmpty()) {
                return;
            }
            $class = $this->input('commentable_type') === 'project'
                ? Project::class : Task::class;
            $parent = Comment::find($parentId);
            if ($parent->commentable_type !== $class || (int) $parent->commentable_id !== (int) $this->input('commentable_id')) {
                $validator->errors()->add('parent_id', 'The parent comment belongs to a different target.');
            }
        });
    }
}
