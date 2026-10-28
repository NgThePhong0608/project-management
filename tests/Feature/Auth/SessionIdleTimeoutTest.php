<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionIdleTimeoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_within_idle_timeout_is_not_logged_out(): void
    {
        config(['session.idle_timeout' => 15]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['last_activity_time' => time() - (10 * 60)])
            ->get('/dashboard');

        $response->assertStatus(200);
        $this->assertAuthenticatedAs($user);
    }

    public function test_inactive_user_exceeding_idle_timeout_is_automatically_logged_out(): void
    {
        config(['session.idle_timeout' => 15]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['last_activity_time' => time() - (16 * 60)])
            ->get('/dashboard');

        $this->assertGuest();
        $response
            ->assertRedirect(route('login'))
            ->assertSessionHas('status', 'Your session has expired due to inactivity. Please log in again.');
    }

    public function test_frontend_idle_logout_redirects_to_login_with_status_message(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout', [
            'reason' => 'idle',
        ]);

        $this->assertGuest();
        $response
            ->assertRedirect(route('login'))
            ->assertSessionHas('status', 'Your session has expired due to inactivity. Please log in again.');
    }

    public function test_session_keep_alive_refreshes_last_activity_time(): void
    {
        config(['session.idle_timeout' => 15]);

        $user = User::factory()->create();
        $staleTimestamp = time() - (12 * 60);

        $response = $this->actingAs($user)
            ->withSession(['last_activity_time' => $staleTimestamp])
            ->post(route('session.keepAlive'));

        $response->assertNoContent();
        $this->assertGreaterThan($staleTimestamp, session('last_activity_time'));
    }
}
