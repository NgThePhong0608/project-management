<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public static $wrap = false;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'parent_id' => $this->parent_id,
            'commentable_type' => class_basename($this->commentable_type) === 'Project' ? 'project' : 'task',
            'commentable_id' => $this->commentable_id,
            'author' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar_url' => $this->user->avatar_url,
            ],
            'mentions' => $this->mentions->map(fn ($m) => [
                'id' => $m->user_id,
                'name' => $m->user?->name,
                'email' => $m->user?->email,
                'avatar_url' => $m->user?->avatar_url,
                'role' => $m->user?->role,
            ])->values(),
            'created_at' => $this->created_at->toIso8601String(),
            'created_at_human' => $this->created_at->diffForHumans(),
        ];
    }
}
