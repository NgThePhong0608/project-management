<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'image_path',
        'status',
        'priority',
        'due_date',
        'assigned_user_id',
        'created_by',
        'updated_by',
        'project_id',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Task $task): void {
            $task->comments()->delete();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function isParticipant(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $this->project->created_by === $user->id
            || $this->project->isMember($user);
    }

    /**
     * Admin, or tasks belonging to projects the user created or joined.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->hasRole('admin')) {
            return $query;
        }

        return $query->whereHas('project', function (Builder $p) use ($user) {
            $p->where('projects.created_by', $user->id)
                ->orWhereHas('members', fn (Builder $m) => $m->where('users.id', $user->id));
        });
    }
}
