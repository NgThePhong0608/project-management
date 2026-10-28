<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLES = ['admin', 'manager', 'member'];

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'avatar_path',
        'cover_path',
        'password',
        'role',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'avatar_url',
        'cover_url',
    ];

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? Storage::url($this->avatar_path) : null;
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? Storage::url($this->cover_path) : null;
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(LoginHistory::class)->latest('occurred_at');
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    protected static function booted(): void
    {
        static::deleting(function (User $user): void {
            $projectIds = Project::where('created_by', $user->id)
                ->orWhere('updated_by', $user->id)
                ->pluck('id');

            $taskIds = Task::where('created_by', $user->id)
                ->orWhere('updated_by', $user->id)
                ->orWhere('assigned_user_id', $user->id)
                ->when($projectIds->isNotEmpty(), fn ($q) => $q->orWhereIn('project_id', $projectIds))
                ->pluck('id');

            if ($taskIds->isNotEmpty()) {
                Comment::where('commentable_type', Task::class)
                    ->whereIn('commentable_id', $taskIds)
                    ->delete();
            }

            if ($projectIds->isNotEmpty()) {
                Comment::where('commentable_type', Project::class)
                    ->whereIn('commentable_id', $projectIds)
                    ->delete();
            }
        });
    }
}
