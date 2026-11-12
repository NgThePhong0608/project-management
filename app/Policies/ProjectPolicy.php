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
     * Only admin (or users with 'projects.quick_assign') can quick-assign a project.
     */
    public function quickAssign(User $user, Project $project): bool
    {
        return $user->can('projects.quick_assign') || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('projects.create') || $user->hasRole('admin', 'manager');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        return $user->can('projects.update') || $user->hasRole('admin', 'manager');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        return $user->can('projects.delete') || $user->hasRole('admin', 'manager');
    }
}
