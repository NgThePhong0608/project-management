<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\SubdomainSessionManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SubdomainSessionManagerTest extends TestCase
{
    use RefreshDatabase;

    protected SubdomainSessionManager $manager;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('redis')->flush();
        $this->manager = app(SubdomainSessionManager::class);
    }

    public function test_generate_slug_format(): void
    {
        $user = User::factory()->create();
        $slug = $this->manager->generateSlug($user);

        $this->assertMatchesRegularExpression('/^[0-9]+-[a-z0-9]{4}$/', $slug);
        $this->assertStringStartsWith((string) $user->id, $slug);
    }

    public function test_register_and_retrieve_active_sessions(): void
    {
        $deviceId = 'device_test_123';
        $user1 = User::factory()->create(['name' => 'Alice Admin', 'role' => 'admin']);
        $user2 = User::factory()->create(['name' => 'Bob Manager', 'role' => 'manager']);

        $slug1 = $this->manager->generateSlug($user1);
        $slug2 = $this->manager->generateSlug($user2);

        $this->manager->registerSession($deviceId, $slug1, $user1, "{$slug1}.app.test");
        $this->manager->registerSession($deviceId, $slug2, $user2, "{$slug2}.app.test");

        $sessions = $this->manager->getActiveSessions($deviceId);

        $this->assertCount(2, $sessions);
        $this->assertArrayHasKey($slug1, $sessions);
        $this->assertArrayHasKey($slug2, $sessions);
        $this->assertEquals($user1->id, $sessions[$slug1]['user_id']);
        $this->assertEquals('admin', $sessions[$slug1]['role']);
        $this->assertEquals("{$slug1}.app.test", $sessions[$slug1]['host']);
    }

    public function test_session_limit_capped_at_five_and_evicts_oldest(): void
    {
        $deviceId = 'device_cap_test';
        $users = User::factory()->count(6)->create();

        $slugs = [];
        foreach ($users as $index => $user) {
            $slug = $this->manager->generateSlug($user);
            $slugs[] = $slug;
            $this->manager->registerSession($deviceId, $slug, $user, "{$slug}.app.test");
        }

        $sessions = $this->manager->getActiveSessions($deviceId);

        // Max 5 allowed
        $this->assertCount(5, $sessions);
        // The first one ($slugs[0]) should have been evicted
        $this->assertArrayNotHasKey($slugs[0], $sessions);
        // The last one should be present
        $this->assertArrayHasKey($slugs[5], $sessions);
        $this->assertTrue($this->manager->isAtSessionLimit($deviceId));
    }

    public function test_terminate_single_and_all_sessions(): void
    {
        $deviceId = 'device_term_test';
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $slug1 = $this->manager->generateSlug($user1);
        $slug2 = $this->manager->generateSlug($user2);

        $this->manager->registerSession($deviceId, $slug1, $user1);
        $this->manager->registerSession($deviceId, $slug2, $user2);

        $this->manager->terminateSession($deviceId, $slug1);
        $this->assertCount(1, $this->manager->getActiveSessions($deviceId));
        $this->assertArrayNotHasKey($slug1, $this->manager->getActiveSessions($deviceId));

        $this->manager->terminateAllSessions($deviceId);
        $this->assertEmpty($this->manager->getActiveSessions($deviceId));
        $this->assertTrue($this->manager->isSessionRevoked($deviceId, $slug2, time() - 10));
    }
}
