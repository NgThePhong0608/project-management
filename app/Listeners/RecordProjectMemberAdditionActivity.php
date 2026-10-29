<?php

namespace App\Listeners;

use App\Events\ProjectMembersAdded;
use App\Models\User;
use App\Services\CommentService;

class RecordProjectMemberAdditionActivity
{
    public function __construct(
        protected CommentService $commentService
    ) {}

    public function handle(ProjectMembersAdded $event): void
    {
        if (empty($event->addedUserIds)) {
            return;
        }

        $addedUsers = User::whereIn('id', $event->addedUserIds)->get(['id', 'name']);
        if ($addedUsers->isEmpty()) {
            return;
        }

        $mentionsText = $addedUsers
            ->map(fn (User $u) => "@[{$u->name}]({$u->id})")
            ->implode(', ');

        $roleLabel = strtoupper($event->role);

        $body = $event->reason === 'quick_assigned'
            ? "📌 {$event->actor->name} assigned project ownership/management to {$mentionsText} ({$roleLabel})."
            : "👋 {$event->actor->name} added {$mentionsText} to the project as {$roleLabel}.";

        $this->commentService->createComment($event->actor, $event->project, $body);
    }
}
