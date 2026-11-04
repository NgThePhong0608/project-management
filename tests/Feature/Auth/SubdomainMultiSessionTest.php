<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\RouteServiceProvider;
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
        Cache::flush();
    }

    public function test_cannot_create_when_multi_session_is_disabled(): void
    {
        $deviceId = 'device_test_disabled';
        $user = User::factory()->create();

        $response = $this->withCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/auth/multi-session/create');

        $response->assertStatus(403);
    }

    public function test_can_enable_and_disable_multi_session(): void
    {
        $deviceId = 'device_test_toggle';
        $manager = app(SubdomainSessionManager::class);
        $user = User::factory()->create();

        // 1. Enable
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/auth/multi-session/enable', [], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertTrue($manager->isMultiSessionEnabled($deviceId));

        // 2. Disable
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/auth/multi-session/disable');

        $response->assertRedirect('http://localhost:8088/login');
        $this->assertFalse($manager->isMultiSessionEnabled($deviceId));
        $this->assertFalse(auth()->check());
    }

    public function test_subdomain_request_rejected_when_multi_session_disabled(): void
    {
        $deviceId = 'device_test_subdomain_rejected';
        $user = User::factory()->create();

        // Multi-session is disabled by default
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->get('http://sess-1234.localhost:8088/dashboard');

        $response->assertRedirect('http://localhost:8088/login');
    }

    public function test_can_create_new_session_subdomain(): void
    {
        $deviceId = 'device_test_create';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);
        $user = User::factory()->create();

        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
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
        $manager->enableMultiSession($deviceId);

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
        $user1 = User::factory()->create(['role' => 'admin']);
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

    public function test_non_admin_cannot_terminate_other_sessions(): void
    {
        $deviceId = 'device_test_term_perm';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);

        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['role' => 'member']);
        $slugAdmin = $manager->generateSlug($admin);
        $slugMember = $manager->generateSlug($member);

        $manager->registerSession($deviceId, $slugAdmin, $admin);
        $manager->registerSession($deviceId, $slugMember, $member);

        // Member tries to terminate Admin's session
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($member)
            ->post('http://localhost:8088/auth/multi-session/terminate', [
                'slug' => $slugAdmin,
            ], ['Accept' => 'application/json']);

        $response->assertStatus(403);
        $this->assertArrayHasKey($slugAdmin, $manager->getActiveSessions($deviceId));

        // Admin terminates Member's session
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($admin)
            ->post('http://localhost:8088/auth/multi-session/terminate', [
                'slug' => $slugMember,
            ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertArrayNotHasKey($slugMember, $manager->getActiveSessions($deviceId));
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
        $manager->enableMultiSession($deviceId);
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

    public function test_login_after_logout_when_multi_session_disabled_does_not_get_signed_out(): void
    {
        $deviceId = 'device_test_login_after_logout';
        $user = User::factory()->create();

        // 1. User logs in
        $loginRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->post('http://localhost:8088/login', [
                'email' => $user->email,
                'password' => 'password',
            ]);
        $loginRes->assertRedirect(RouteServiceProvider::HOME);
        $this->assertAuthenticatedAs($user);

        // 2. User logs out
        $logoutRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->post('http://localhost:8088/logout');
        $this->assertGuest();

        // 3. User logs in again
        $reLoginRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->post('http://localhost:8088/login', [
                'email' => $user->email,
                'password' => 'password',
            ]);
        $reLoginRes->assertRedirect(RouteServiceProvider::HOME);
        $this->assertAuthenticatedAs($user);

        // 4. Request dashboard
        $dashRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($user)
            ->get('http://localhost:8088/dashboard');

        $dashRes->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_disabling_multi_session_from_subdomain_revokes_primary_host_session(): void
    {
        $deviceId = 'device_test_disable_revokes_primary';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);

        $userPrimary = User::factory()->create();
        $userSub = User::factory()->create();
        $slugSub = $manager->generateSlug($userSub);

        // Primary session active
        $primaryLoginTime = microtime(true);
        $manager->registerSession($deviceId, 'primary', $userPrimary);

        // Subdomain session active
        $manager->registerSession($deviceId, $slugSub, $userSub);

        // Disable multi-session from subdomain host
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($userSub)
            ->withSession(['subdomain_session_time' => $primaryLoginTime])
            ->post("http://{$slugSub}.localhost:8088/auth/multi-session/disable");

        $response->assertRedirect('http://localhost:8088/login');
        $this->assertFalse($manager->isMultiSessionEnabled($deviceId));

        // Primary host request must be revoked and signed out
        $primaryReq = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->actingAs($userPrimary)
            ->withSession(['subdomain_session_time' => $primaryLoginTime])
            ->get('http://localhost:8088/dashboard');

        $primaryReq->assertRedirect('http://localhost:8088/login');
        $this->assertFalse(auth()->check());
    }

    public function test_guest_cannot_view_device_sessions_registry_in_inertia_props(): void
    {
        $deviceId = 'device_test_guest_leak';
        $manager = app(SubdomainSessionManager::class);
        $user = User::factory()->create(['email' => 'victim@example.com']);
        $manager->registerSession($deviceId, 'primary', $user);

        // Guest accesses login with device ID
        $response = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->get('http://localhost:8088/login');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('auth.user', null)
            ->where('auth.activeSubdomainSessions', [])
            ->where('auth.activeSubdomainSessionsCount', 0)
        );
    }

    public function test_raw_device_id_query_param_does_not_override_existing_cookie(): void
    {
        $victimDeviceId = 'dev_victim_safe';
        $attackerDeviceId = 'dev_attacker_injected';

        $user = User::factory()->create();

        $response = $this->withUnencryptedCookies(['pm_device_id' => $victimDeviceId])
            ->actingAs($user)
            ->get("http://localhost:8088/dashboard?device_id={$attackerDeviceId}");

        $response->assertOk();
        // The resolved device ID stored in session must remain the victim's
        $this->assertEquals($victimDeviceId, session('subdomain_device_id'));
    }

    public function test_authenticated_transfer_token_binds_device_id_and_is_single_use(): void
    {
        $trustedDeviceId = 'dev_trusted_transfer';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($trustedDeviceId);
        $token = $manager->createTransferToken($trustedDeviceId);

        // First use: binds trusted device id
        $response = $this->get("http://sess-abc1.localhost:8088/login?session_transfer={$token}");
        $response->assertOk();
        $this->assertEquals($trustedDeviceId, session('subdomain_device_id'));

        // Second use: token is already consumed, should not reuse
        $this->assertNull($manager->consumeTransferToken($token));
    }
}
