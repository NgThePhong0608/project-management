<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'phongnt@example.com'],
            [
                'name' => 'PhongNT (Admin)',
                'role' => 'admin',
                'password' => bcrypt('matkhau123Z@'),
                'email_verified_at' => now(),
            ]
        );

        $manager = User::firstOrCreate(
            ['email' => 'manager@example.com'],
            [
                'name' => 'Manager User',
                'role' => 'manager',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );

        $member = User::firstOrCreate(
            ['email' => 'member@example.com'],
            [
                'name' => 'Member User',
                'role' => 'member',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );

        $users = [$admin, $manager, $member];

        if (Project::count() === 0) {
            for ($i = 0; $i < 10; $i++) {
                $creator = $users[array_rand([$admin, $manager])];
                $project = Project::factory()->create([
                    'created_by' => $creator->id,
                    'updated_by' => $creator->id,
                ]);

                for ($j = 0; $j < 5; $j++) {
                    $assignedUser = $users[array_rand($users)];
                    Task::factory()->create([
                        'project_id' => $project->id,
                        'created_by' => $creator->id,
                        'updated_by' => $creator->id,
                        'assigned_user_id' => $assignedUser->id,
                    ]);
                }
            }
        }
    }
}
