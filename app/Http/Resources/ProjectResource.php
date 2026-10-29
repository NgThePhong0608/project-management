<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProjectResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $loadedMembers = $this->resource->relationLoaded('members') ? $this->members : null;

        $myProjectRole = null;
        if ($user) {
            if ($this->created_by === $user->id) {
                $myProjectRole = 'owner';
            } elseif ($loadedMembers) {
                $memberMatch = $loadedMembers->firstWhere('id', $user->id);
                if ($memberMatch) {
                    $myProjectRole = $memberMatch->pivot?->role ?? 'member';
                }
            }
        }

        // Users belonging to this project (excluding global 'admin' role) eligible for quick task assignment
        $assignableMembers = [];
        if ($loadedMembers) {
            $pool = $loadedMembers->concat($this->createdBy ? [$this->createdBy] : [])
                ->filter(fn ($u) => $u && $u->role !== 'admin')
                ->unique('id')
                ->sortBy('name')
                ->values();

            $assignableMembers = $pool->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
            ])->all();
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'created_at' => (new Carbon($this->created_at))->format('Y-m-d H:i:s'),
            'updated_at' => (new Carbon($this->updated_at))->format('Y-m-d H:i:s'),
            'due_date' => (new Carbon($this->due_date))->format('Y-m-d H:i:s'),
            'status' => $this->status,
            'image_path' => $this->image_path ? Storage::url($this->image_path) : '',
            'image_name' => $this->image_path ? basename($this->image_path) : null,
            'createdBy' => new UserResource($this->createdBy),
            'updatedBy' => new UserResource($this->updatedBy),
            'members_count' => $this->members_count ?? ($loadedMembers ? $loadedMembers->count() : $this->members()->count()),
            'tasks_count' => $this->tasks_count ?? ($this->resource->relationLoaded('tasks') ? $this->tasks->count() : null),
            'members_preview' => $loadedMembers
                ? $loadedMembers->take(5)->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'avatar_url' => $u->avatar_url,
                    'role' => $u->pivot?->role,
                ])->values()
                : [],
            'assignable_members' => $assignableMembers,
            'my_project_role' => $myProjectRole,
            'can' => [
                'update' => $user?->can('update', $this->resource),
                'delete' => $user?->can('delete', $this->resource),
                'manageMembers' => $user?->can('manageMembers', $this->resource),
                'quickAssign' => $user?->can('quickAssign', $this->resource),
            ],
        ];
    }
}
