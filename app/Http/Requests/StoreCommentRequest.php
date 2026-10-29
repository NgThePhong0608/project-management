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
            'body' => ['required', 'string', 'max:10000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $body = (string) $this->input('body', '');

            if (stripos($body, 'data:image/') !== false || stripos($body, 'data:video/') !== false) {
                $validator->errors()->add('body', 'Inline base64 media is not allowed. Please upload images/videos using the toolbar.');

                return;
            }

            $hasImage = preg_match('/<img\b[^>]*src=/i', $body)
                || preg_match('/!\[[^\]]*\]\([^)]+\)/', $body)
                || preg_match('/\[[^\]]+\]\(attachment:[^)]+\)/', $body);
            $plainText = trim(html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($plainText === '' && ! $hasImage && ! $validator->errors()->has('body')) {
                $validator->errors()->add('body', 'The comment body cannot be empty.');

                return;
            }

            if (preg_match_all('/\(attachment:([^)\s]+)\)/', $body, $attMatches)) {
                $expectedPrefix = sprintf(
                    'comment/%s_%d_u%d_',
                    (string) $this->input('commentable_type'),
                    (int) $this->input('commentable_id'),
                    (int) $this->user()?->id
                );

                foreach ($attMatches[1] as $attPath) {
                    if (! str_starts_with($attPath, $expectedPrefix)) {
                        $validator->errors()->add('body', 'You can only attach files that you uploaded for this target.');

                        return;
                    }
                }
            }

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
