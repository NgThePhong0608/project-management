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
