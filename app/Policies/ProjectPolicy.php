<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $project->created_by === $user->id || $project->isMember($user);
    }

    /**
     * Admin (via Gate::before), project creator, or a member with the 'manager' role.
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $project->created_by === $user->id
            || $project->members()->where('users.id', $user->id)->wherePivot('role', 'manager')->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('manager');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        return $user->hasRole('manager');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        return $user->hasRole('manager');
    }
}
