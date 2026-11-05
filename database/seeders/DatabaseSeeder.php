<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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

        $extraMembers = [];
        for ($k = 1; $k <= 10; $k++) {
            $extraMembers[] = User::firstOrCreate(
                ['email' => "member{$k}@example.com"],
                [
                    'name' => "Member User {$k}",
                    'role' => 'member',
                    'password' => bcrypt('password'),
                    'email_verified_at' => now(),
                ]
            );
        }

        $users = [$admin, $manager, $member, ...$extraMembers];

        $this->call(RealisticDataSeeder::class);
    }
}
