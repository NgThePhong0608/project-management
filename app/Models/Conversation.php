<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    /**
     * Get the partner user in a direct 1-1 conversation.
     */
    public function getPartner(int $currentUserId): ?User
    {
        return $this->users->firstWhere('id', '!=', $currentUserId);
    }

    /**
     * Check if a user is a participant of this conversation.
     */
    public function isParticipant(int $userId): bool
    {
        return $this->users->contains('id', $userId);
    }

    /**
     * Mark the conversation as read for a given user.
     */
    public function markAsRead(int $userId): void
    {
        $this->users()->updateExistingPivot($userId, [
            'last_read_at' => now(),
        ]);
    }

    /**
     * Scope a query to only include conversations for a given user.
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->whereHas('users', fn ($q) => $q->where('users.id', $userId));
    }

    /**
     * Find or create a direct 1-1 conversation between two users.
     */
    public static function findOrCreateDirect(int $userOneId, int $userTwoId): self
    {
        if ($userOneId === $userTwoId) {
            throw new \InvalidArgumentException('Cannot create a direct conversation with oneself.');
        }

        // Find existing direct conversation containing both users
        $conversation = self::query()
            ->where('type', 'direct')
            ->whereHas('users', fn ($q) => $q->where('users.id', $userOneId))
            ->whereHas('users', fn ($q) => $q->where('users.id', $userTwoId))
            ->first();

        if ($conversation) {
            return $conversation;
        }

        $conversation = self::create([
            'type' => 'direct',
            'last_message_at' => now(),
        ]);

        $conversation->users()->attach([
            $userOneId => ['last_read_at' => now()],
            $userTwoId => ['last_read_at' => null],
        ]);

        return $conversation;
    }
}
