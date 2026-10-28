<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class TurnstileAndMailRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_is_blocked_when_turnstile_fails(): void
    {
        config([
            'services.turnstile.enabled' => true,
            'services.turnstile.secret_key' => 'test-secret',
        ]);

        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
                'success' => false,
                'error-codes' => ['invalid-input-response'],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', [
            'email' => $user->email,
            'cf_turnstile_response' => 'invalid-bot-token',
        ]);

        $response->assertSessionHasErrors('cf_turnstile_response');
    }

    public function test_turnstile_fails_closed_when_enabled_without_secret_key(): void
    {
        config([
            'services.turnstile.enabled' => true,
            'services.turnstile.secret_key' => null,
        ]);

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', [
            'email' => $user->email,
            'cf_turnstile_response' => 'any-token',
        ]);

        $response->assertSessionHasErrors('cf_turnstile_response');
    }

    public function test_forgot_password_succeeds_when_turnstile_passes(): void
    {
        Notification::fake();

        config([
            'services.turnstile.enabled' => true,
            'services.turnstile.secret_key' => 'test-secret',
        ]);

        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
                'success' => true,
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', [
            'email' => $user->email,
            'cf_turnstile_response' => 'valid-human-token',
        ]);

        $response->assertSessionHasNoErrors();
    }

    public function test_forgot_password_is_rate_limited_after_three_attempts(): void
    {
        Notification::fake();
        config(['services.turnstile.enabled' => false]);

        $user = User::factory()->create();
        RateLimiter::clear('mail-forgot-password:'.strtolower($user->email).'|127.0.0.1');

        for ($i = 0; $i < 3; $i++) {
            DB::table('password_reset_tokens')->truncate();
            $this->post('/forgot-password', ['email' => $user->email])
                ->assertSessionHasNoErrors();
        }

        // 4th attempt within 15 minutes should be blocked by custom mail rate limiter
        DB::table('password_reset_tokens')->truncate();
        $response = $this->post('/forgot-password', ['email' => $user->email]);

        $response->assertSessionHasErrors('email');
    }

    public function test_email_verification_resend_is_rate_limited_after_three_attempts(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();
        RateLimiter::clear('mail-verification:'.$user->id);

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($user)
                ->post('/email/verification-notification')
                ->assertSessionHasNoErrors();
        }

        $response = $this->actingAs($user)->post('/email/verification-notification');
        $response->assertSessionHasErrors('email');
    }
}
