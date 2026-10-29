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
        $this->project->members()->attach([$this->member->id, $this->otherMember->id]);

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

    public function test_only_admin_and_manager_can_update_task_or_project_to_closed_status(): void
    {
        // Member can update own assigned task to in_progress/completed, but NOT closed
        $this->actingAs($this->member)->put(route('task.update', $this->memberTask), [
            'name' => $this->memberTask->name,
            'status' => 'closed',
            'priority' => 'high',
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->member->id,
        ])->assertSessionHasErrors('status');

        $this->assertNotEquals('closed', $this->memberTask->fresh()->status);

        // Manager can update task and project to closed
        $this->actingAs($this->manager)->put(route('task.update', $this->memberTask), [
            'name' => $this->memberTask->name,
            'status' => 'closed',
            'priority' => 'high',
            'project_id' => $this->project->id,
            'assigned_user_id' => $this->member->id,
        ])->assertRedirect(route('task.index'));

        $this->assertEquals('closed', $this->memberTask->fresh()->status);

        $this->actingAs($this->manager)->put(route('project.update', $this->project), [
            'name' => $this->project->name,
            'status' => 'closed',
        ])->assertRedirect(route('project.index'));

        $this->assertEquals('closed', $this->project->fresh()->status);
    }

    public function test_quick_assign_project_is_restricted_to_admin_only(): void
    {
        $newOwner = User::factory()->create(['role' => 'manager']);

        // Member and Manager cannot quick-assign a project
        $this->actingAs($this->member)
            ->patch(route('project.quickAssign', $this->project), ['assigned_user_id' => $newOwner->id])
            ->assertForbidden();

        $this->actingAs($this->manager)
            ->patch(route('project.quickAssign', $this->project), ['assigned_user_id' => $newOwner->id])
            ->assertForbidden();

        // Admin cannot quick-assign a project to a non-manager user
        $this->actingAs($this->admin)
            ->patch(route('project.quickAssign', $this->project), ['assigned_user_id' => $this->member->id])
            ->assertSessionHasErrors('assigned_user_id');

        // Admin can quick-assign the project to a manager; new owner becomes created_by and manager in project_user
        $this->actingAs($this->admin)
            ->patch(route('project.quickAssign', $this->project), ['assigned_user_id' => $newOwner->id])
            ->assertRedirect();

        $this->assertEquals($newOwner->id, $this->project->fresh()->created_by);
        $this->assertDatabaseHas('project_user', [
            'project_id' => $this->project->id,
            'user_id' => $newOwner->id,
            'role' => 'manager',
        ]);
    }

    public function test_quick_assign_task_is_restricted_to_admin_and_manager(): void
    {
        $outsider = User::factory()->create(['role' => 'member']);

        // Member cannot quick-assign task (even their own assigned task)
        $this->actingAs($this->member)
            ->patch(route('task.quickAssign', $this->memberTask), ['assigned_user_id' => $this->otherMember->id])
            ->assertForbidden();

        // Manager/Admin cannot quick-assign task to a user who has NOT joined the project or to an admin
        $this->actingAs($this->manager)
            ->patch(route('task.quickAssign', $this->memberTask), ['assigned_user_id' => $outsider->id])
            ->assertSessionHasErrors('assigned_user_id');

        $this->actingAs($this->admin)
            ->patch(route('task.quickAssign', $this->memberTask), ['assigned_user_id' => $this->admin->id])
            ->assertSessionHasErrors('assigned_user_id');

        // Manager of the project can quick-assign task to a member who already joined the project
        $this->actingAs($this->manager)
            ->patch(route('task.quickAssign', $this->memberTask), ['assigned_user_id' => $this->otherMember->id])
            ->assertRedirect();

        $this->assertEquals($this->otherMember->id, $this->memberTask->fresh()->assigned_user_id);

        // Admin can also quick-assign task to a project member
        $this->actingAs($this->admin)
            ->patch(route('task.quickAssign', $this->memberTask), ['assigned_user_id' => $this->member->id])
            ->assertRedirect();

        $this->assertEquals($this->member->id, $this->memberTask->fresh()->assigned_user_id);
    }

    public function test_only_admin_can_quick_update_user_role(): void
    {
        $this->actingAs($this->manager)
            ->patch(route('user.updateRole', $this->member), ['role' => 'manager'])
            ->assertForbidden();

        $this->actingAs($this->admin)
            ->patch(route('user.updateRole', $this->member), ['role' => 'manager'])
            ->assertRedirect();

        $this->assertEquals('manager', $this->member->fresh()->role);
    }
}
