<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'image_path' => $this->image_path,
            'assignedUser' => $this->assignedUser ?  new UserResource($this->assignedUser) : null,
            'project' => new ProjectResource($this->project),
            'createdBy' => new UserResource($this->createdBy),
            'updatedBy' => new UserResource($this->updatedBy),
        ];
    }
}
