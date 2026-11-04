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
        Cache::flush();
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
        $manager->enableMultiSession($deviceId);
        $slug = $manager->generateSlug($user1);
        $manager->registerSession($deviceId, $slug, $user1, "{$slug}.localhost");

        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user1)
            ->get("http://{$slug}.localhost:8088/dashboard");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('auth.subdomainSlug', $slug)
            ->where('auth.canSwitchSubdomainSessions', true)
            ->has('auth.activeSubdomainSessions', 1)
            ->where('auth.activeSubdomainSessions.0.slug', $slug)
            ->where('auth.activeSubdomainSessions.0.role', 'admin')
        );
    }

    public function test_non_admin_only_sees_count_not_other_session_details(): void
    {
        $deviceId = 'device_routing_non_admin';
        $admin = User::factory()->create(['name' => 'Root Admin', 'role' => 'admin']);
        $member = User::factory()->create(['name' => 'Regular Member', 'role' => 'member']);

        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);
        $slugAdmin = $manager->generateSlug($admin);
        $slugMember = $manager->generateSlug($member);

        $manager->registerSession($deviceId, $slugAdmin, $admin, "{$slugAdmin}.localhost");
        $manager->registerSession($deviceId, $slugMember, $member, "{$slugMember}.localhost");

        // Member requests dashboard
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($member)
            ->get("http://{$slugMember}.localhost:8088/dashboard");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('auth.subdomainSlug', $slugMember)
            ->where('auth.canSwitchSubdomainSessions', false)
            ->where('auth.activeSubdomainSessionsCount', 2)
            // Does not see admin's session in activeSubdomainSessions list
            ->has('auth.activeSubdomainSessions', 1)
            ->where('auth.activeSubdomainSessions.0.slug', $slugMember)
            ->where('auth.activeSubdomainSessions.0.role', 'member')
        );
    }
}
