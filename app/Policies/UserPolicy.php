<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * All actions default to false for non-admin.
     * Admin is handled automatically via Gate::before.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    public function view(User $user, User $model): bool
    {
        return false;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, User $model): bool
    {
        return false;
    }

    public function delete(User $user, User $model): bool
    {
        return false;
    }
}
