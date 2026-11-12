<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

class NotificationPolicy
{
    /**
     * Determine whether the user can view any notifications.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('notifications.view') || $user->hasRole('admin', 'manager', 'member');
    }

    /**
     * Determine whether the user can view the specific notification.
     */
    public function view(User $user, DatabaseNotification $notification): bool
    {
        return $notification->notifiable_type === User::class
            && (int) $notification->notifiable_id === (int) $user->id
            && ($user->can('notifications.view') || $user->hasRole('admin', 'manager', 'member'));
    }
}
