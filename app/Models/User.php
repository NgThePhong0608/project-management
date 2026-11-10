<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable {
        HasRoles::hasRole as spatieHasRole;
    }

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
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'mfa_unconfigured_login_count',
        'locked_until',
        'lock_reason',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'avatar_url',
        'cover_url',
        'has_mfa',
        'is_locked',
    ];

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? Storage::url($this->avatar_path) : null;
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? Storage::url($this->cover_path) : null;
    }

    public function getHasMfaAttribute(): bool
    {
        return ! is_null($this->two_factor_confirmed_at);
    }

    public function getIsLockedAttribute(): bool
    {
        return ! is_null($this->locked_until) && $this->locked_until->isFuture();
    }

    public function hasMfa(): bool
    {
        return $this->has_mfa;
    }

    public function isLocked(): bool
    {
        return $this->is_locked;
    }

    public function unlock(): void
    {
        $this->update([
            'locked_until' => null,
            'lock_reason' => null,
            'mfa_unconfigured_login_count' => 0,
        ]);
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(LoginHistory::class)->latest('occurred_at');
    }

    public function oauthAccounts(): HasMany
    {
        return $this->hasMany(OAuthAccount::class);
    }

    public function hasConnectedProvider(string $provider): bool
    {
        return $this->oauthAccounts()->where('provider', $provider)->exists();
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)
            ->withPivot('last_read_at', 'unread_count')
            ->withTimestamps();
    }

    public function hasRole($roles, ?string $guard = null): bool
    {
        $args = func_get_args();
        if (count($args) > 1 && ! in_array($guard, ['web', 'api', null], true)) {
            $roles = $args;
            $guard = null;
        }

        try {
            if ($this->roles()->exists()) {
                return $this->spatieHasRole($roles, $guard);
            }
        } catch (\Throwable $e) {
            // Table might not exist during early migrations
        }

        $checkRoles = is_array($roles) ? $roles : explode('|', (string) $roles);

        return in_array($this->role, $checkRoles, true);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'two_factor_secret' => 'encrypted',
        'two_factor_recovery_codes' => 'encrypted',
        'two_factor_confirmed_at' => 'datetime',
        'locked_until' => 'datetime',
        'mfa_unconfigured_login_count' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saved(function (User $user) {
            if (! empty($user->role)) {
                try {
                    $user->syncRoles([$user->role]);
                } catch (\Throwable $e) {
                    // Ignore during raw migration or when roles table not yet seeded
                }
            }
        });

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
