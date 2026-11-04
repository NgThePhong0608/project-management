<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\SubdomainSessionManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SubdomainRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('redis')->flush();
    }

    public function test_root_domain_request_sets_device_cookie(): void
    {
        $response = $this->get('http://localhost:8088/login');
        $response->assertOk();
        $response->assertCookie('pm_device_id');
    }

    public function test_subdomain_request_identifies_slug_and_shares_sessions(): void
    {
        $deviceId = 'device_routing_123';
        $user1 = User::factory()->create(['name' => 'Alice Admin', 'role' => 'admin']);

        $manager = app(SubdomainSessionManager::class);
        $slug = $manager->generateSlug($user1);
        $manager->registerSession($deviceId, $slug, $user1, "{$slug}.localhost");

        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user1)
            ->get("http://{$slug}.localhost:8088/dashboard");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('auth.subdomainSlug', $slug)
            ->has('auth.activeSubdomainSessions', 1)
            ->where('auth.activeSubdomainSessions.0.slug', $slug)
            ->where('auth.activeSubdomainSessions.0.role', 'admin')
        );
    }
}
