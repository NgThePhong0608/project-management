<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\SubdomainSessionManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SubdomainMultiSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('redis')->flush();
    }

    public function test_can_create_new_session_subdomain(): void
    {
        $deviceId = 'device_test_create';
        $user = User::factory()->create();

        $response = $this->withCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/auth/multi-session/create');

        $response->assertJsonStructure(['url', 'slug']);
        $json = $response->json();
        $this->assertStringContainsString($json['slug'], $json['url']);
    }

    public function test_cannot_create_when_limit_of_five_reached(): void
    {
        $deviceId = 'device_test_limit';
        $manager = app(SubdomainSessionManager::class);

        // Pre-fill 5 sessions
        for ($i = 0; $i < 5; $i++) {
            $user = User::factory()->create();
            $slug = $manager->generateSlug($user);
            $manager->registerSession($deviceId, $slug, $user);
        }

        $user = User::factory()->create();
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/auth/multi-session/create');

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Maximum of 5 active sessions reached. Please close a session first.']);
    }

    public function test_can_terminate_subdomain_session(): void
    {
        $deviceId = 'device_test_term';
        $manager = app(SubdomainSessionManager::class);
        $user1 = User::factory()->create();
        $slug1 = $manager->generateSlug($user1);
        $manager->registerSession($deviceId, $slug1, $user1);

        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user1)
            ->post('http://localhost:8088/auth/multi-session/terminate', [
                'slug' => $slug1,
            ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertArrayNotHasKey($slug1, $manager->getActiveSessions($deviceId));
    }

    public function test_can_terminate_all_subdomain_sessions(): void
    {
        $deviceId = 'device_test_term_all';
        $manager = app(SubdomainSessionManager::class);
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $slug1 = $manager->generateSlug($user1);
        $slug2 = $manager->generateSlug($user2);
        $manager->registerSession($deviceId, $slug1, $user1);
        $manager->registerSession($deviceId, $slug2, $user2);

        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user1)
            ->post('http://localhost:8088/auth/multi-session/terminate-all', [], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEmpty($manager->getActiveSessions($deviceId));
    }

    public function test_subdomain_request_auto_logs_out_if_session_terminated(): void
    {
        $deviceId = 'device_test_auto_logout';
        $manager = app(SubdomainSessionManager::class);
        $user = User::factory()->create();
        $slug = $manager->generateSlug($user);

        // Pre-register session
        $manager->registerSession($deviceId, $slug, $user);

        // Explicitly terminate it
        $manager->terminateSession($deviceId, $slug);

        // Request with session set as registered
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->withSession([
                'subdomain_registered' => true,
                'subdomain_session_time' => time(),
            ])
            ->get("http://{$slug}.localhost:8088/dashboard");

        $response->assertRedirect("http://{$slug}.localhost:8088/login");
        $this->assertFalse(auth()->check());
    }
}
