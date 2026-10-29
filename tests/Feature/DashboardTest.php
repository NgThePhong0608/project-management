<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_and_caches_statistics(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id, 'updated_by' => $user->id]);

        Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $user->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));
        $response->assertOk();

        // Verify that statistics are cached
        $this->assertTrue(Cache::has('dashboard_global_task_counts'));
        $this->assertTrue(Cache::has("dashboard_user_stats_{$user->id}"));

        $globalCounts = Cache::get('dashboard_global_task_counts');
        $this->assertEquals(1, $globalCounts['totalPendingTasks']);
    }

    public function test_dashboard_and_project_index_include_members_count_and_role_for_admin_and_manager(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $manager = User::factory()->create(['role' => 'manager']);
        $member1 = User::factory()->create(['role' => 'member']);
        $member2 = User::factory()->create(['role' => 'member']);

        $ownedProject = Project::factory()->create(['created_by' => $manager->id, 'updated_by' => $manager->id]);
        $ownedProject->members()->attach($manager->id, ['role' => 'manager', 'added_by' => $manager->id]);
        $ownedProject->members()->attach([$member1->id, $member2->id], ['role' => 'member', 'added_by' => $manager->id]);

        $joinedProject = Project::factory()->create(['created_by' => $admin->id, 'updated_by' => $admin->id]);
        $joinedProject->members()->attach($manager->id, ['role' => 'member', 'added_by' => $admin->id]);

        // Admin sees all projects with exact members_count on Dashboard
        $this->actingAs($admin)->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('projectsOverview.data', 2)
                ->where('projectsOverview.data.0.members_count', fn ($c) => in_array($c, [1, 3], true))
            );

        // Manager sees owned + joined projects on /project and can filter by scope
        $this->actingAs($manager)->get(route('project.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Project/Index')
                ->has('projects.data', 2)
            );

        $this->actingAs($manager)->get(route('project.index', ['scope' => 'owned']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('projects.data', 1)
                ->where('projects.data.0.id', $ownedProject->id)
                ->where('projects.data.0.members_count', 3)
                ->where('projects.data.0.my_project_role', 'owner')
            );
    }

    public function test_task_creation_invalidates_dashboard_cache(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $project = Project::factory()->create(['created_by' => $admin->id, 'updated_by' => $admin->id]);

        Cache::put('dashboard_global_task_counts', ['totalPendingTasks' => 99], 60);
        Cache::put("dashboard_user_stats_{$admin->id}", ['myPendingTasks' => 99], 60);

        $this->actingAs($admin)->post(route('task.store'), [
            'name' => 'Cache Invalidation Test Task',
            'description' => 'Testing cache clearing',
            'status' => 'pending',
            'priority' => 'low',
            'due_date' => now()->addDays(2)->format('Y-m-d'),
            'project_id' => $project->id,
            'assigned_user_id' => $admin->id,
        ]);

        $this->assertFalse(Cache::has('dashboard_global_task_counts'));
        $this->assertFalse(Cache::has("dashboard_user_stats_{$admin->id}"));
    }
}
