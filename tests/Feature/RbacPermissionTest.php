<?php

namespace Tests\Feature;

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
}
