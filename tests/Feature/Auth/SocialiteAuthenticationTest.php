<?php

namespace Tests\Feature\Auth;

use App\Models\OAuthAccount;
use App\Models\User;
use App\Services\SubdomainSessionManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class SocialiteAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_redirect_to_oauth_provider(): void
    {
        $response = $this->get(route('auth.social.redirect', 'github'));
        $response->assertStatus(302);

        $responseX = $this->get(route('auth.social.redirect', 'x'));
        $responseX->assertStatus(302);

        $responseGitLab = $this->get(route('auth.social.redirect', 'gitlab'));
        $responseGitLab->assertStatus(302);

        $this->get(route('auth.social.redirect', 'invalid-provider'))->assertStatus(404);
    }

    public function test_callback_registers_new_user_via_gitlab(): void
    {
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gl-7890';
        $mockSocialUser->name = 'GitLab Dev';
        $mockSocialUser->nickname = 'gldev';
        $mockSocialUser->email = 'gldev@example.com';
        $mockSocialUser->avatar = 'https://gitlab.com/avatar.png';
        $mockSocialUser->token = 'mock_gl_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('gitlab')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'gitlab'));

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        $this->assertDatabaseHas('oauth_accounts', [
            'provider' => 'gitlab',
            'provider_id' => 'gl-7890',
            'nickname' => 'gldev',
        ]);
    }

    public function test_callback_registers_new_user_and_oauth_account(): void
    {
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-12345';
        $mockSocialUser->name = 'GitHub Dev';
        $mockSocialUser->nickname = 'ghdev';
        $mockSocialUser->email = 'ghdev@example.com';
        $mockSocialUser->avatar = 'https://github.com/avatar.png';
        $mockSocialUser->token = 'mock_gh_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('github')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'github'));

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        $user = User::where('email', 'ghdev@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->password);
        $this->assertEquals('member', $user->role);

        $this->assertDatabaseHas('oauth_accounts', [
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'gh-12345',
            'nickname' => 'ghdev',
        ]);
    }

    public function test_callback_links_to_existing_user_with_same_email(): void
    {
        $existing = User::factory()->create([
            'email' => 'existing@example.com',
        ]);

        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-9999';
        $mockSocialUser->name = 'Existing User';
        $mockSocialUser->nickname = 'existing';
        $mockSocialUser->email = 'existing@example.com';
        $mockSocialUser->token = 'token_abc';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('github')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'github'));

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($existing);

        $this->assertDatabaseHas('oauth_accounts', [
            'user_id' => $existing->id,
            'provider' => 'github',
            'provider_id' => 'gh-9999',
        ]);
    }

    public function test_callback_fallback_email_for_x_when_email_is_null(): void
    {
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'x-7777';
        $mockSocialUser->name = 'X User';
        $mockSocialUser->nickname = 'xhandle';
        $mockSocialUser->email = null;
        $mockSocialUser->token = 'x_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('twitter-oauth-2')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'x'));

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        $this->assertDatabaseHas('oauth_accounts', [
            'provider' => 'x',
            'provider_id' => 'x-7777',
            'nickname' => 'xhandle',
        ]);

        $user = User::where('email', 'x_x-7777_xhandle@users.noreply.x.com')->first();
        $this->assertNotNull($user);
    }

    public function test_callback_routes_to_two_factor_challenge_if_mfa_is_enabled(): void
    {
        $user = User::factory()->create([
            'email' => 'mfa_user@example.com',
            'two_factor_secret' => 'SECRET123',
            'two_factor_confirmed_at' => now(),
        ]);

        OAuthAccount::create([
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'gh-mfa',
        ]);

        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-mfa';
        $mockSocialUser->email = 'mfa_user@example.com';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('github')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'github'));

        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
        $this->assertEquals($user->id, session('login.two_factor_user_id'));
    }

    public function test_callback_denies_login_if_user_is_locked(): void
    {
        $user = User::factory()->create([
            'email' => 'locked@example.com',
            'locked_until' => now()->addMinutes(30),
            'lock_reason' => 'Account is temporarily locked.',
        ]);

        OAuthAccount::create([
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'gh-locked',
        ]);

        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-locked';
        $mockSocialUser->email = 'locked@example.com';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('github')->once()->andReturn($mockProvider);

        $response = $this->get(route('auth.social.callback', 'github'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email' => 'Account is temporarily locked.']);
        $this->assertGuest();
    }

    public function test_unlink_oauth_account(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);

        OAuthAccount::create([
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'gh-unlink',
        ]);

        $response = $this->actingAs($user)->delete(route('auth.social.unlink', 'github'));

        $response->assertRedirect();
        $this->assertDatabaseMissing('oauth_accounts', [
            'user_id' => $user->id,
            'provider' => 'github',
        ]);
    }

    public function test_unlink_denied_if_user_has_no_password_and_single_oauth_account(): void
    {
        $user = User::factory()->create([
            'password' => null,
        ]);

        OAuthAccount::create([
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'gh-only',
        ]);

        $response = $this->actingAs($user)->delete(route('auth.social.unlink', 'github'));

        $response->assertSessionHasErrors(['oauth']);
        $this->assertDatabaseHas('oauth_accounts', [
            'user_id' => $user->id,
            'provider' => 'github',
        ]);
    }

    public function test_subdomain_oauth_handoff_authenticates_on_initiating_host(): void
    {
        $deviceId = 'device_test_oauth_sub';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);

        // 1. Initiate OAuth on subdomain host
        $redirectRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->get('http://sess-1234.localhost:8088/auth/github/redirect');
        $redirectRes->assertStatus(302);

        $targetUrl = $redirectRes->headers->get('Location');
        parse_str(parse_url($targetUrl, PHP_URL_QUERY) ?? '', $query);
        $state = $query['state'] ?? null;
        $this->assertNotNull($state);

        $browserState = $redirectRes->getCookie('oauth_browser_state', false)?->getValue();
        $this->assertNotNull($browserState);
        $sessionNonce = session('oauth_handoff_nonce');
        $this->assertNotNull($sessionNonce);

        // 2. Mock Socialite driver
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-sub-999';
        $mockSocialUser->name = 'Subdomain Dev';
        $mockSocialUser->nickname = 'subdev';
        $mockSocialUser->email = 'subdev@example.com';
        $mockSocialUser->avatar = 'https://github.com/avatar.png';
        $mockSocialUser->token = 'mock_sub_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);

        Socialite::shouldReceive('driver')->with('github')->andReturn($mockProvider);

        // 3. Callback hits primary host with initiating browser cookie
        $callbackRes = $this->withUnencryptedCookies([
            'pm_device_id' => $deviceId,
            'oauth_browser_state' => $browserState,
        ])
            ->get("http://localhost:8088/auth/github/callback?code=mock_code&state={$state}");
        $callbackRes->assertStatus(302);

        $handoffUrl = $callbackRes->headers->get('Location');
        $this->assertStringContainsString('sess-1234.localhost:8088/auth/oauth-handoff?token=', $handoffUrl);

        // Primary host must remain unauthenticated
        $this->assertFalse(auth()->check());

        // 4. Client completes handoff on the initiating subdomain host carrying the session nonce
        $handoffRes = $this->withSession(['oauth_handoff_nonce' => $sessionNonce])
            ->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->get($handoffUrl);
        $handoffRes->assertRedirect(route('dashboard', absolute: false));
        $this->assertTrue(auth()->check());
        $this->assertEquals('subdev@example.com', auth()->user()->email);

        $this->assertDatabaseHas('oauth_accounts', [
            'provider' => 'github',
            'provider_id' => 'gh-sub-999',
        ]);
    }

    public function test_oauth_handoff_rejects_missing_or_mismatched_session_nonce_preventing_login_csrf(): void
    {
        $deviceId = 'device_attacker_csrf';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($deviceId);

        // 1. Attacker initiates OAuth on subdomain host and gets valid state + session nonce
        $redirectRes = $this->withUnencryptedCookies(['pm_device_id' => $deviceId])
            ->get('http://sess-1234.localhost:8088/auth/github/redirect');
        $redirectRes->assertStatus(302);

        $targetUrl = $redirectRes->headers->get('Location');
        parse_str(parse_url($targetUrl, PHP_URL_QUERY) ?? '', $query);
        $state = $query['state'] ?? null;
        $browserState = $redirectRes->getCookie('oauth_browser_state', false)?->getValue();

        // 2. Mock Socialite driver for attacker's social account
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-attacker-888';
        $mockSocialUser->name = 'Attacker Account';
        $mockSocialUser->nickname = 'attacker';
        $mockSocialUser->email = 'attacker@example.com';
        $mockSocialUser->avatar = 'https://github.com/avatar.png';
        $mockSocialUser->token = 'mock_atk_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialUser);
        Socialite::shouldReceive('driver')->with('github')->andReturn($mockProvider);

        // 3. Attacker completes OAuth callback on primary host to obtain valid handoff URL
        $callbackRes = $this->withUnencryptedCookies([
            'pm_device_id' => $deviceId,
            'oauth_browser_state' => $browserState,
        ])
            ->get("http://localhost:8088/auth/github/callback?code=mock_code&state={$state}");
        $callbackRes->assertStatus(302);
        $handoffUrl = $callbackRes->headers->get('Location');

        // 4. Attacker sends handoffUrl to a victim with multi-session enabled. Victim visits without the attacker's session nonce.
        $this->flushSession();
        $victimDeviceId = 'device_victim_multi';
        $manager->enableMultiSession($victimDeviceId);
        $victimRes = $this->withUnencryptedCookies(['pm_device_id' => $victimDeviceId])
            ->get($handoffUrl);

        // Must reject handoff and prevent Login CSRF
        $victimRes->assertRedirect('http://localhost:8088/login');
        $victimRes->assertSessionHas('status', 'Authentication handoff session mismatch. Please try signing in again.');
        $this->assertFalse(auth()->check());
    }

    public function test_oauth_handoff_rejects_browser_mismatch_preventing_account_takeover(): void
    {
        $attackerDeviceId = 'device_attacker';
        $manager = app(SubdomainSessionManager::class);
        $manager->enableMultiSession($attackerDeviceId);

        // 1. Attacker initiates flow with malicious X-Forwarded-Host
        $redirectRes = $this->withHeaders(['X-Forwarded-Host' => 'a-b.evil.com'])
            ->withUnencryptedCookies(['pm_device_id' => $attackerDeviceId])
            ->get('http://sess-evil.localhost:8088/auth/github/redirect');

        $redirectRes->assertStatus(302);
        $targetUrl = $redirectRes->headers->get('Location');
        parse_str(parse_url($targetUrl, PHP_URL_QUERY) ?? '', $query);
        $state = $query['state'] ?? null;
        $this->assertNotNull($state);

        // Attacker gets browser binding on attacker's client
        $attackerBrowserState = $redirectRes->getCookie('oauth_browser_state', false)?->getValue();
        $this->assertNotNull($attackerBrowserState);

        // 2. Mock Socialite driver
        $mockSocialUser = new SocialiteUser;
        $mockSocialUser->id = 'gh-victim-111';
        $mockSocialUser->name = 'Victim User';
        $mockSocialUser->nickname = 'victim';
        $mockSocialUser->email = 'victim@example.com';
        $mockSocialUser->avatar = 'https://github.com/avatar.png';
        $mockSocialUser->token = 'mock_victim_token';

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldNotReceive('stateless');
        $mockProvider->shouldNotReceive('user');
        Socialite::shouldReceive('driver')->with('github')->andReturn($mockProvider);

        // 3. Victim visits real callback with provider state, but victim has NO matching browser binding cookie
        $this->flushHeaders();
        $victimCallbackRes = $this->withUnencryptedCookies(['pm_device_id' => 'device_victim'])
            ->get("http://localhost:8088/auth/github/callback?code=mock_code&state={$state}");

        // Must reject callback immediately before user extraction and never redirect to attacker host
        $victimCallbackRes->assertRedirect('http://localhost:8088/login');
        $this->assertStringNotContainsString('evil.com', (string) $victimCallbackRes->headers->get('Location'));
        $victimCallbackRes->assertSessionHas('status', 'Authentication session mismatch. Please try signing in again.');

        // Victim account must not be created or handed off
        $this->assertDatabaseMissing('users', ['email' => 'victim@example.com']);
        $this->assertFalse(auth()->check());
    }
}
