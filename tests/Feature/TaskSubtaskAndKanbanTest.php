<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskSubtask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskSubtaskAndKanbanTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_can_be_created_with_subtasks(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $member = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach($member->id, ['role' => 'member', 'added_by' => $manager->id]);

        $response = $this->actingAs($manager)->post(route('task.store'), [
            'name' => 'Build Kanban',
            'status' => 'pending',
            'priority' => 'high',
            'project_id' => $project->id,
            'assigned_user_id' => $member->id,
            'subtasks' => ['Create migration', 'Build UI component'],
        ]);

        $response->assertRedirect(route('project.index'));
        $task = Task::where('name', 'Build Kanban')->firstOrFail();
        $this->assertCount(2, $task->subtasks);
        $this->assertSame(['Create migration', 'Build UI component'], $task->subtasks->pluck('title')->all());
    }

    public function test_assignee_can_add_toggle_and_delete_subtasks(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $assignee = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach($assignee->id, ['role' => 'member', 'added_by' => $manager->id]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $this->actingAs($assignee)
            ->post(route('task.subtasks.store', $task), ['titles' => ['Step 1', 'Step 2']])
            ->assertRedirect();

        $subtask = $task->subtasks()->firstOrFail();
        $this->assertFalse($subtask->is_completed);

        $this->actingAs($assignee)
            ->patch(route('task.subtasks.toggle', [$task, $subtask]))
            ->assertRedirect();

        $this->assertTrue($subtask->fresh()->is_completed);

        $this->actingAs($assignee)
            ->delete(route('task.subtasks.destroy', [$task, $subtask]))
            ->assertRedirect();

        $this->assertDatabaseMissing('task_subtasks', ['id' => $subtask->id]);
    }

    public function test_other_member_cannot_modify_subtasks_and_cross_task_is_blocked(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $assignee = User::factory()->create(['role' => 'member']);
        $otherMember = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach([
            $assignee->id => ['role' => 'member', 'added_by' => $manager->id],
            $otherMember->id => ['role' => 'member', 'added_by' => $manager->id],
        ]);

        $taskA = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);
        $taskB = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $subtaskB = TaskSubtask::create([
            'task_id' => $taskB->id,
            'title' => 'Belongs to Task B',
            'position' => 1,
        ]);

        $this->actingAs($otherMember)
            ->post(route('task.subtasks.store', $taskA), ['title' => 'Unauthorized'])
            ->assertForbidden();

        $this->actingAs($assignee)
            ->patch(route('task.subtasks.toggle', [$taskA, $subtaskB]))
            ->assertNotFound();
    }

    public function test_kanban_view_and_status_update_respect_permissions(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $assignee = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach($assignee->id, ['role' => 'member', 'added_by' => $manager->id]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'status' => 'pending',
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $this->actingAs($assignee)
            ->get(route('task.index', ['view' => 'kanban']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Task/Index')
                ->where('queryParams.view', 'kanban')
                ->has('tasks.data', 1)
            );

        $this->actingAs($assignee)
            ->patch(route('task.updateStatus', $task), ['status' => 'in_progress'])
            ->assertRedirect();

        $this->assertSame('in_progress', $task->fresh()->status);

        // Member cannot move a task to closed
        $this->actingAs($assignee)
            ->patch(route('task.updateStatus', $task), ['status' => 'closed'])
            ->assertSessionHasErrors('status');

        // Manager can move a task to closed
        $this->actingAs($manager)
            ->patch(route('task.updateStatus', $task), ['status' => 'closed'])
            ->assertRedirect();

        $this->assertSame('closed', $task->fresh()->status);
    }
}

