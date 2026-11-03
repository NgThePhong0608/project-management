<?php

namespace Tests\Feature\Auth;

use App\Models\OAuthAccount;
use App\Models\User;
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
}
