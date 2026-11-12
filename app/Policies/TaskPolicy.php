<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
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
    public function view(User $user, Task $task): bool
    {
        return $task->isParticipant($user);
    }

    /**
     * Only users with 'tasks.quick_assign' (or manager/admin) who can view the task can quick-assign.
     */
    public function quickAssign(User $user, Task $task): bool
    {
        return ($user->can('tasks.quick_assign') || $user->hasRole('admin', 'manager')) && $this->view($user, $task);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('tasks.create') || $user->hasRole('admin', 'manager');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }

        return $user->can('tasks.update') || $user->hasRole('admin', 'manager') || $task->assigned_user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }

        return $user->can('tasks.delete') || $user->hasRole('admin', 'manager');
    }
}
