<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_not_found_returns_404_status_and_renders_error_component(): void
    {
        $response = $this->get('/non-existent-page-url-xyz');

        $response->assertNotFound();
        $response->assertInertia(fn ($page) => $page
            ->component('Error')
            ->where('status', 404)
        );
    }

    public function test_forbidden_returns_403_status_and_renders_error_component(): void
    {
        $member = User::factory()->create(['role' => 'member']);

        $response = $this->actingAs($member)->get(route('user.index'));

        $response->assertForbidden();
        $response->assertInertia(fn ($page) => $page
            ->component('Error')
            ->where('status', 403)
        );
    }

    public function test_unauthenticated_json_request_receives_json_unauthorized(): void
    {
        $response = $this->getJson(route('notifications.unreadCount'));

        $response->assertUnauthorized();
    }
}
