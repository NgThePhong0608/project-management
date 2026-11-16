<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TaskResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'created_at' => (new Carbon($this->created_at))->format('Y-m-d H:i:s'),
            'updated_at' => (new Carbon($this->updated_at))->format('Y-m-d H:i:s'),
            'due_date' => (new Carbon($this->due_date))->format('Y-m-d H:i:s'),
            'status' => $this->status,
            'priority' => $this->priority,
            'project_id' => $this->project_id,
            'assigned_user_id' => $this->assigned_user_id,
            'image_path' => $this->image_path ? Storage::url($this->image_path) : '',
            'image_name' => $this->image_path ? basename($this->image_path) : null,
            'assignedUser' => $this->assignedUser ? new UserResource($this->assignedUser) : null,
            'project' => new ProjectResource($this->project),
            'createdBy' => new UserResource($this->createdBy),
            'updatedBy' => new UserResource($this->updatedBy),
            'activities' => $this->whenLoaded('activities', fn () => $this->activities->map(fn ($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'changes' => $a->changes,
                'created_at' => $a->created_at?->format('Y-m-d H:i:s'),
                'user' => $a->user ? ['id' => $a->user->id, 'name' => $a->user->name] : null,
            ])->values()),
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($att) => [
                'id' => $att->id,
                'original_name' => $att->original_name,
                'mime_type' => $att->mime_type,
                'size' => $att->size,
                'created_at' => $att->created_at?->format('Y-m-d H:i:s'),
                'user' => $att->user ? ['id' => $att->user->id, 'name' => $att->user->name] : null,
            ])->values()),
            'subtasks' => $this->whenLoaded('subtasks', fn () => $this->subtasks->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'is_completed' => (bool) $s->is_completed,
                'position' => $s->position,
            ])->values()),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'completed_subtasks_count' => $this->whenHas('completed_subtasks_count'),
            'can' => [
                'update' => $request->user()?->can('update', $this->resource),
                'delete' => $request->user()?->can('delete', $this->resource),
                'quickAssign' => $request->user()?->can('quickAssign', $this->resource),
            ],
        ];
    }
}
