<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private User $member;
    private User $otherMember;
    private Project $project;
    private Task $memberTask;
    private Task $otherTask;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->manager = User::factory()->create(['role' => 'manager']);
        $this->member = User::factory()->create(['role' => 'member']);
        $this->otherMember = User::factory()->create(['role' => 'member']);

        $this->project = Project::factory()->create([
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
        ]);

        $this->memberTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->member->id,
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
        ]);

        $this->otherTask = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->otherMember->id,
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
        ]);
    }

    public function test_member_cannot_manage_users(): void
    {
        $this->actingAs($this->member)->get(route('user.index'))->assertForbidden();
        $this->actingAs($this->member)->get(route('user.create'))->assertForbidden();
        $this->actingAs($this->member)->post(route('user.store'), [
            'name' => 'New User',
            'email' => 'new@example.com',
            'role' => 'member',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertForbidden();
    }

    public function test_admin_can_manage_users(): void
    {
        $this->actingAs($this->admin)->get(route('user.index'))->assertOk();
        $this->actingAs($this->admin)->delete(route('user.destroy', $this->otherMember))->assertRedirect(route('user.index'));
        $this->assertDatabaseMissing('users', ['id' => $this->otherMember->id]);
    }

    public function test_member_cannot_create_or_delete_project(): void
    {
        $this->actingAs($this->member)->get(route('project.create'))->assertForbidden();
        $this->actingAs($this->member)->post(route('project.store'), [
            'name' => 'Hack Project',
            'status' => 'pending',
        ])->assertForbidden();
        $this->actingAs($this->member)->delete(route('project.destroy', $this->project))->assertForbidden();
    }

    public function test_manager_can_create_project(): void
    {
        $response = $this->actingAs($this->manager)->post(route('project.store'), [
            'name' => 'Manager Project',
            'status' => 'pending',
        ]);
        $response->assertRedirect(route('project.index'));
        $this->assertDatabaseHas('projects', ['name' => 'Manager Project']);
    }

    public function test_member_can_update_own_assigned_task(): void
    {
        $response = $this->actingAs($this->member)->put(route('task.update', $this->memberTask), [
            'name' => 'Updated By Member',
            'status' => 'in_progress',
            'priority' => 'high',
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->member->id,
        ]);
        $response->assertRedirect(route('task.index'));
        $this->assertDatabaseHas('tasks', [
            'id' => $this->memberTask->id,
            'name' => 'Updated By Member',
        ]);
    }

    public function test_member_cannot_update_other_task(): void
    {
        $this->actingAs($this->member)->put(route('task.update', $this->otherTask), [
            'name' => 'Hacked Task',
            'status' => 'completed',
            'priority' => 'high',
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->otherMember->id,
        ])->assertForbidden();
    }

    public function test_member_cannot_delete_task(): void
    {
        $this->actingAs($this->member)->delete(route('task.destroy', $this->memberTask))->assertForbidden();
    }
}
