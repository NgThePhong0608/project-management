<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'email' => $this->email,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_url,
            'has_mfa' => (bool) $this->has_mfa,
            'is_locked' => (bool) $this->is_locked,
            'mfa_unconfigured_login_count' => (int) $this->mfa_unconfigured_login_count,
            'locked_until' => $this->locked_until?->format('Y-m-d H:i:s'),
            'created_at' => (new Carbon($this->created_at))->format('Y-m-d H:i:s'),
        ];
    }
}
