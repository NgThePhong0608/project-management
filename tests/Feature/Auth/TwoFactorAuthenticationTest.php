<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\RouteServiceProvider;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected TwoFactorService $twoFactorService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->twoFactorService = app(TwoFactorService::class);
    }

    public function test_user_can_initialize_two_factor_authentication(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('profile.two-factor.enable'));

        $response->assertOk()
            ->assertJsonStructure(['secret', 'qr_code_url']);

        $user->refresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertFalse($user->hasMfa());
    }

    public function test_user_can_confirm_two_factor_authentication_with_valid_code(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update(['two_factor_secret' => $secret, 'mfa_unconfigured_login_count' => 3]);

        $code = $this->twoFactorService->getCurrentCode($secret);

        $response = $this->actingAs($user)->postJson(route('profile.two-factor.confirm'), [
            'code' => $code,
        ]);

        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure(['recovery_codes']);

        $user->refresh();
        $this->assertTrue($user->hasMfa());
        $this->assertNotNull($user->two_factor_confirmed_at);
        $this->assertSame(0, $user->mfa_unconfigured_login_count);
        $this->assertIsArray(json_decode((string) $user->two_factor_recovery_codes, true));
    }

    public function test_user_cannot_confirm_two_factor_with_invalid_code(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update(['two_factor_secret' => $secret]);

        $response = $this->actingAs($user)->postJson(route('profile.two-factor.confirm'), [
            'code' => '000000',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);

        $user->refresh();
        $this->assertFalse($user->hasMfa());
    }

    public function test_user_can_view_and_regenerate_recovery_codes_with_valid_password(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $initialCodes = ['code-1', 'code-2'];

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode($initialCodes),
        ]);

        // View recovery codes with correct password
        $viewResponse = $this->actingAs($user)->postJson(route('profile.two-factor.recovery-codes'), [
            'password' => 'password',
        ]);

        $viewResponse->assertOk()
            ->assertJson(['recovery_codes' => $initialCodes]);

        // Regenerate recovery codes with correct password
        $regenResponse = $this->actingAs($user)->postJson(route('profile.two-factor.regenerate-recovery-codes'), [
            'password' => 'password',
        ]);

        $regenResponse->assertOk()
            ->assertJsonStructure(['recovery_codes']);

        $newCodes = $regenResponse->json('recovery_codes');
        $this->assertCount(8, $newCodes);
        $this->assertNotEquals($initialCodes, $newCodes);
    }

    public function test_user_cannot_view_recovery_codes_with_wrong_password(): void
    {
        $user = User::factory()->create();
        $user->update([
            'two_factor_secret' => 'SECRET',
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(['code-1']),
        ]);

        $response = $this->actingAs($user)->postJson(route('profile.two-factor.recovery-codes'), [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_user_can_disable_two_factor_authentication(): void
    {
        $user = User::factory()->create();
        $user->update([
            'two_factor_secret' => 'SECRET',
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(['code-1']),
        ]);

        $response = $this->actingAs($user)->deleteJson(route('profile.two-factor.disable'), [
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $user->refresh();
        $this->assertNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->two_factor_recovery_codes);
        $this->assertFalse($user->hasMfa());
    }

    public function test_user_with_mfa_is_redirected_to_two_factor_challenge_upon_login(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(['rec-code-1']),
        ]);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertEquals($user->id, session('login.two_factor_user_id'));
    }

    public function test_user_can_authenticate_via_two_factor_challenge_with_totp_code(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(['rec-code-1']),
        ]);

        $code = $this->twoFactorService->getCurrentCode($secret);

        $response = $this->withSession(['login.two_factor_user_id' => $user->id])
            ->post('/two-factor-challenge', [
                'code' => $code,
            ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(RouteServiceProvider::HOME);
    }

    public function test_user_can_authenticate_via_two_factor_challenge_with_recovery_code(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $recoveryCodes = ['code-one-1234', 'code-two-5678'];
        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
        ]);

        $response = $this->withSession(['login.two_factor_user_id' => $user->id])
            ->post('/two-factor-challenge', [
                'recovery_code' => 'code-one-1234',
            ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(RouteServiceProvider::HOME);

        $user->refresh();
        $remaining = json_decode((string) $user->two_factor_recovery_codes, true);
        $this->assertNotContains('code-one-1234', $remaining);
        $this->assertContains('code-two-5678', $remaining);
    }

    public function test_two_factor_challenge_fails_with_invalid_code(): void
    {
        $user = User::factory()->create();
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->withSession(['login.two_factor_user_id' => $user->id])
            ->post('/two-factor-challenge', [
                'code' => '999999',
            ]);

        $response->assertSessionHasErrors(['code']);
        $this->assertGuest();
    }

    public function test_user_without_mfa_login_increments_unconfigured_count(): void
    {
        $user = User::factory()->create(['mfa_unconfigured_login_count' => 0]);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(RouteServiceProvider::HOME);

        $user->refresh();
        $this->assertEquals(1, $user->mfa_unconfigured_login_count);
        $this->assertFalse($user->isLocked());
    }

    public function test_fifth_login_without_mfa_locks_account_and_displays_required_message(): void
    {
        $user = User::factory()->create(['mfa_unconfigured_login_count' => 4]);

        $expectedMessage = 'Your account has been locked due to exceeding 5 logins without setting up Two-Factor Authentication. Please contact an administrator to unlock your account.';

        // 5th login attempt
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors(['email' => $expectedMessage]);

        $user->refresh();
        $this->assertEquals(5, $user->mfa_unconfigured_login_count);
        $this->assertTrue($user->isLocked());
        $this->assertNotNull($user->locked_until);

        // Subsequent login attempt while locked
        $subsequentResponse = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $subsequentResponse->assertSessionHasErrors(['email' => $expectedMessage]);
    }

    public function test_admin_can_unlock_locked_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $lockedUser = User::factory()->create([
            'mfa_unconfigured_login_count' => 5,
            'locked_until' => now()->addDay(),
            'lock_reason' => 'Exceeded 5 logins',
        ]);

        $this->assertTrue($lockedUser->isLocked());

        $response = $this->actingAs($admin)->post(route('user.unlock', $lockedUser->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $lockedUser->refresh();
        $this->assertFalse($lockedUser->isLocked());
        $this->assertNull($lockedUser->locked_until);
        $this->assertNull($lockedUser->lock_reason);
        $this->assertEquals(0, $lockedUser->mfa_unconfigured_login_count);
    }

    public function test_non_admin_cannot_unlock_locked_account(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        $lockedUser = User::factory()->create([
            'mfa_unconfigured_login_count' => 5,
            'locked_until' => now()->addDay(),
        ]);

        $response = $this->actingAs($member)->post(route('user.unlock', $lockedUser->id));

        $response->assertStatus(403);
        $lockedUser->refresh();
        $this->assertTrue($lockedUser->isLocked());
    }
}
