<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserShowAssignedTasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_detail_only_shows_assigned_tasks_from_shared_projects(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $viewerMember = User::factory()->create(['role' => 'member']);
        $targetUser = User::factory()->create(['role' => 'member']);
        $outsider = User::factory()->create(['role' => 'member']);

        // Project A: viewerMember and targetUser both joined
        $projectA = Project::factory()->create(['created_by' => $admin->id]);
        $projectA->members()->attach([$viewerMember->id, $targetUser->id]);

        // Project B: targetUser joined, but viewerMember did NOT join
        $projectB = Project::factory()->create(['created_by' => $admin->id]);
        $projectB->members()->attach([$targetUser->id]);

        // Task A in Project A assigned to targetUser
        $taskA = Task::factory()->create([
            'project_id' => $projectA->id,
            'assigned_user_id' => $targetUser->id,
            'name' => 'Task In Shared Project',
        ]);

        // Task B in Project B assigned to targetUser
        $taskB = Task::factory()->create([
            'project_id' => $projectB->id,
            'assigned_user_id' => $targetUser->id,
            'name' => 'Task In Private Project',
        ]);

        // 1. Viewer member views targetUser: sees only Task A (1 task), not Task B
        $this->actingAs($viewerMember)
            ->get(route('user.show', $targetUser->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('User/Show')
                ->where('user.id', $targetUser->id)
                ->has('tasks.data', 1)
                ->where('tasks.data.0.id', $taskA->id)
                ->where('tasks.data.0.name', 'Task In Shared Project')
            );

        // 2. Outsider (joined neither project) views targetUser: sees 0 tasks
        $this->actingAs($outsider)
            ->get(route('user.show', $targetUser->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('User/Show')
                ->has('tasks.data', 0)
            );

        // 3. Admin views targetUser: sees both Task A and Task B (2 tasks)
        $this->actingAs($admin)
            ->get(route('user.show', $targetUser->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('User/Show')
                ->has('tasks.data', 2)
            );
    }
}
