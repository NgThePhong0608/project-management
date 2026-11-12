<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RbacPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_roles_and_permissions_seeder_initializes_expected_roles_and_permissions(): void
    {
        $this->assertTrue(Role::where('name', 'admin')->exists());
        $this->assertTrue(Role::where('name', 'manager')->exists());
        $this->assertTrue(Role::where('name', 'member')->exists());

        $expectedPermissions = [
            'projects.view', 'projects.create', 'projects.update', 'projects.delete',
            'projects.manage_members', 'projects.quick_assign',
            'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete',
            'tasks.quick_assign', 'tasks.ai',
            'users.view', 'users.manage',
            'comments.create', 'comments.delete',
            'notifications.view',
        ];

        foreach ($expectedPermissions as $perm) {
            $this->assertTrue(Permission::where('name', $perm)->exists(), "Missing permission: {$perm}");
        }

        $managerRole = Role::findByName('manager');
        $this->assertTrue($managerRole->hasPermissionTo('projects.create'));
        $this->assertTrue($managerRole->hasPermissionTo('tasks.create'));
        $this->assertFalse($managerRole->hasPermissionTo('users.manage'));

        $memberRole = Role::findByName('member');
        $this->assertTrue($memberRole->hasPermissionTo('tasks.view'));
        $this->assertTrue($memberRole->hasPermissionTo('notifications.view'));
        $this->assertFalse($memberRole->hasPermissionTo('tasks.update'));
        $this->assertFalse($memberRole->hasPermissionTo('projects.create'));
    }

    public function test_user_saved_event_synchronizes_spatie_role(): void
    {
        $user = User::factory()->create(['role' => 'member']);
        $this->assertTrue($user->hasRole('member'));

        $user->update(['role' => 'manager']);
        $this->assertTrue($user->fresh()->hasRole('manager'));
        $this->assertTrue($user->can('projects.create'));
    }

    public function test_custom_granular_permission_allows_action_for_member(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        $this->assertFalse($member->can('projects.create'));

        // Grant individual permission directly to member
        $member->givePermissionTo('projects.create');
        $this->assertTrue($member->fresh()->can('projects.create'));

        $response = $this->actingAs($member)->post(route('project.store'), [
            'name' => 'Member Granted Project',
            'status' => 'pending',
        ]);
        $response->assertRedirect(route('project.index'));
        $this->assertDatabaseHas('projects', ['name' => 'Member Granted Project']);
    }

    public function test_inertia_shares_roles_and_permissions(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);

        $response = $this->actingAs($manager)->get(route('dashboard'));
        $response->assertOk();

        $page = $response->original->getData()['page'];
        $auth = $page['props']['auth'];

        $this->assertContains('manager', $auth['roles']);
        $this->assertContains('projects.create', $auth['permissions']);
        $this->assertContains('tasks.create', $auth['permissions']);
    }

    public function test_profile_save_with_stale_role_does_not_resync_demoted_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->assertTrue($admin->hasRole('admin'));

        // Load stale instance
        $staleInstance = User::find($admin->id);

        // Demote user via UserController::updateRole
        $anotherAdmin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($anotherAdmin)->patch(route('user.updateRole', $admin), [
            'role' => 'member',
        ]);

        $this->assertSame('member', $admin->fresh()->role);
        $this->assertTrue($admin->fresh()->hasRole('member'));
        $this->assertFalse($admin->fresh()->hasRole('admin'));

        // Stale instance saves profile update (e.g. name update at ProfileController:112)
        $staleInstance->name = 'Updated Admin Name';
        $staleInstance->save();

        // Ensure legacy role remains demoted and pivot was NOT re-synced to admin
        $refreshed = User::find($admin->id);
        $this->assertSame('member', $refreshed->role);
        $this->assertFalse($refreshed->hasRole('admin'));
        $this->assertTrue($refreshed->hasRole('member'));
    }

    public function test_member_with_seeded_permissions_cannot_update_other_members_task(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $member = User::factory()->create(['role' => 'member']);
        $otherMember = User::factory()->create(['role' => 'member']);

        $project = Project::factory()->create(['created_by' => $manager->id, 'updated_by' => $manager->id]);
        $project->members()->attach([$member->id, $otherMember->id]);

        $ownTask = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $member->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $otherTask = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $otherMember->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        // Member can update their own assigned task
        $this->actingAs($member)->put(route('task.update', $ownTask), [
            'name' => 'Updated Own Task',
            'status' => 'in_progress',
            'priority' => 'low',
            'project_id' => $project->id,
            'assigned_user_id' => $member->id,
        ])->assertRedirect(route('task.index'));

        // Member cannot update other member's task
        $this->actingAs($member)->put(route('task.update', $otherTask), [
            'name' => 'Hacked Other Task',
            'status' => 'completed',
            'priority' => 'high',
            'project_id' => $project->id,
            'assigned_user_id' => $otherMember->id,
        ])->assertForbidden();
    }
}
