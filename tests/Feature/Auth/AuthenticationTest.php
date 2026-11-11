<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(RouteServiceProvider::HOME);
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_expired_session_or_csrf_mismatch_redirects_back_with_status_message(): void
    {
        Route::post('/test-csrf-419', function () {
            throw new TokenMismatchException;
        });

        $response = $this->from('/login')->post('/test-csrf-419', [
            'email' => 'test@example.com',
            'password' => 'secret',
        ]);

        $response->assertRedirect('/login');
        $response->assertSessionHas('status', 'Your session has expired. Please try again.');
    }

    public function test_csrf_mismatch_on_api_json_request_returns_419(): void
    {
        Route::post('/test-csrf-419-api', function () {
            throw new TokenMismatchException;
        });

        $response = $this->postJson('/test-csrf-419-api', [
            'email' => 'test@example.com',
            'password' => 'secret',
        ]);

        $response->assertStatus(419);
    }
}
