<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = \App\Models\User::factory()->create([
            'name' => 'PhongNT (Admin)',
            'email' => 'phongnt@example.com',
            'role' => 'admin',
            'password' => bcrypt('matkhau123Z@'),
            'email_verified_at' => now(),
        ]);

        $manager = \App\Models\User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager@example.com',
            'role' => 'manager',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $member = \App\Models\User::factory()->create([
            'name' => 'Member User',
            'email' => 'member@example.com',
            'role' => 'member',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $users = [$admin, $manager, $member];

        for ($i = 0; $i < 10; $i++) {
            $creator = $users[array_rand([$admin, $manager])];
            $project = \App\Models\Project::factory()->create([
                'created_by' => $creator->id,
                'updated_by' => $creator->id,
            ]);

            for ($j = 0; $j < 5; $j++) {
                $assignedUser = $users[array_rand($users)];
                \App\Models\Task::factory()->create([
                    'project_id' => $project->id,
                    'created_by' => $creator->id,
                    'updated_by' => $creator->id,
                    'assigned_user_id' => $assignedUser->id,
                ]);
            }
        }
    }
}
