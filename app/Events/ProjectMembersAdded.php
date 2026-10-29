<?php

namespace App\Events;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectMembersAdded
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, int>  $addedUserIds
     */
    public function __construct(
        public Project $project,
        public User $actor,
        public array $addedUserIds,
        public string $role = 'member',
        public string $reason = 'added'
    ) {}
}
