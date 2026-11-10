<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define all granular system permissions
        $permissions = [
            // Projects
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.delete',
            'projects.manage_members',
            'projects.quick_assign',

            // Tasks
            'tasks.view',
            'tasks.create',
            'tasks.update',
            'tasks.delete',
            'tasks.quick_assign',
            'tasks.ai',

            // Users
            'users.view',
            'users.manage',

            // Comments
            'comments.create',
            'comments.delete',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName);
        }

        // 2. Create roles and assign specific permissions
        $adminRole = Role::findOrCreate('admin');
        $adminRole->syncPermissions(Permission::all());

        $managerRole = Role::findOrCreate('manager');
        $managerRole->syncPermissions([
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.delete',
            'projects.manage_members',
            'tasks.view',
            'tasks.create',
            'tasks.update',
            'tasks.delete',
            'tasks.quick_assign',
            'tasks.ai',
            'users.view',
            'comments.create',
            'comments.delete',
        ]);

        $memberRole = Role::findOrCreate('member');
        $memberRole->syncPermissions([
            'projects.view',
            'tasks.view',
            'tasks.update',
            'users.view',
            'comments.create',
        ]);

        // 3. Migrate and synchronize existing users with Spatie roles
        User::query()->chunk(100, function ($users) {
            /** @var User $user */
            foreach ($users as $user) {
                if (! empty($user->role) && in_array($user->role, ['admin', 'manager', 'member'], true)) {
                    $user->syncRoles([$user->role]);
                }
            }
        });
    }
}
