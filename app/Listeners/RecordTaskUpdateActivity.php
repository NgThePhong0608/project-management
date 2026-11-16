<?php

namespace App\Listeners;

use App\Events\TaskActivityRecorded;
use App\Models\Project;
use App\Models\TaskActivity;
use App\Models\User;
use App\Services\CommentService;

class RecordTaskUpdateActivity
{
    private const STATUS_LABELS = [
        'pending' => 'Pending',
        'in_progress' => 'In Progress',
        'completed' => 'Completed',
        'closed' => 'Closed',
    ];

    private const PRIORITY_LABELS = [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
    ];

    public function __construct(
        protected CommentService $commentService
    ) {}

    public function handle(TaskActivityRecorded $event): void
    {
        if (empty($event->changes)) {
            return;
        }

        $lines = [];
        $structuredChanges = [];
        $assigneeMentioned = false;

        foreach ($event->changes as $field => $diff) {
            $old = $diff['old'] ?? null;
            $new = $diff['new'] ?? null;

            switch ($field) {
                case 'status':
                    $oldLabel = self::STATUS_LABELS[$old] ?? (string) $old;
                    $newLabel = self::STATUS_LABELS[$new] ?? (string) $new;
                    $lines[] = "- Status: `{$oldLabel}` → `{$newLabel}`";
                    $structuredChanges['status'] = ['old' => $oldLabel, 'new' => $newLabel];
                    break;

                case 'priority':
                    $oldLabel = self::PRIORITY_LABELS[$old] ?? (string) $old;
                    $newLabel = self::PRIORITY_LABELS[$new] ?? (string) $new;
                    $lines[] = "- Priority: `{$oldLabel}` → `{$newLabel}`";
                    $structuredChanges['priority'] = ['old' => $oldLabel, 'new' => $newLabel];
                    break;

                case 'assigned_user_id':
                    $oldUser = $old ? User::find($old) : null;
                    $newUser = $new ? User::find($new) : null;
                    $oldText = $oldUser ? $oldUser->name : 'Unassigned';
                    $newText = $newUser ? "@[{$newUser->name}]({$newUser->id})" : 'Unassigned';
                    $assigneeMentioned = $newUser !== null;
                    $lines[] = "- Assigned User: {$oldText} → {$newText}";
                    $structuredChanges['assignee'] = ['old' => $oldText, 'new' => $newUser ? $newUser->name : 'Unassigned'];
                    break;

                case 'due_date':
                    $oldDate = $old ?: 'None';
                    $newDate = $new ?: 'None';
                    $lines[] = "- Due Date: `{$oldDate}` → `{$newDate}`";
                    $structuredChanges['due_date'] = ['old' => $oldDate, 'new' => $newDate];
                    break;

                case 'name':
                    $lines[] = "- Task Name: `{$old}` → `{$new}`";
                    $structuredChanges['name'] = ['old' => $old, 'new' => $new];
                    break;

                case 'project_id':
                    $oldProj = $old ? Project::find($old)?->name : 'N/A';
                    $newProj = $new ? Project::find($new)?->name : 'N/A';
                    $lines[] = "- Project: `{$oldProj}` → `{$newProj}`";
                    $structuredChanges['project'] = ['old' => $oldProj, 'new' => $newProj];
                    break;

                case 'description':
                    $lines[] = '- Description: Updated';
                    $structuredChanges['description'] = ['old' => null, 'new' => 'Updated'];
                    break;

                case 'image_path':
                    $oldName = $old ? basename($old) : null;
                    $newName = $new ? basename($new) : null;
                    if ($old && $new) {
                        $lines[] = "- Task Image: Updated\n  📎 [{$oldName}](attachment:{$old}) → 📎 [{$newName}](attachment:{$new})";
                    } elseif ($new) {
                        $lines[] = "- Task Image: Added 📎 [{$newName}](attachment:{$new})";
                    } else {
                        $lines[] = '- Task Image: Removed';
                    }
                    $structuredChanges['image'] = ['old' => $oldName, 'new' => $newName ?? 'Removed'];
                    break;
            }
        }

        if (empty($lines)) {
            return;
        }

        TaskActivity::create([
            'task_id' => $event->task->id,
            'user_id' => $event->actor->id,
            'action' => isset($event->changes['status']) && count($event->changes) === 1 ? 'status_updated' : 'updated',
            'changes' => $structuredChanges,
            'created_at' => now(),
        ]);

        // Tag the currently assigned user (if different from the actor and not already tagged) so they get a priority notification
        $assigneeSuffix = '';
        $currentAssignee = $event->task->assignedUser;
        if (! $assigneeMentioned && $currentAssignee && $currentAssignee->id !== $event->actor->id) {
            $assigneeSuffix = " (cc @[{$currentAssignee->name}]({$currentAssignee->id}))";
        }

        $header = isset($event->changes['status']) && count($event->changes) === 1
            ? "🔄 {$event->actor->name} updated the task status{$assigneeSuffix}:"
            : "📝 {$event->actor->name} updated task details{$assigneeSuffix}:";

        $body = $header."\n".implode("\n", $lines);

        $this->commentService->createComment($event->actor, $event->task, $body);
    }
}
