<?php

namespace Tests\Unit;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationGroupAndUnreadTest extends TestCase
{
    use RefreshDatabase;

    public function test_conversation_group_attributes_and_helpers(): void
    {
        $creator = User::factory()->create();
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $group = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => 'Project Alpha Team',
            'created_by' => $creator->id,
        ]);

        $group->users()->attach([
            $creator->id => ['unread_count' => 0],
            $user1->id => ['unread_count' => 3],
            $user2->id => ['unread_count' => 1],
        ]);

        $this->assertTrue($group->isGroup());
        $this->assertFalse($group->isDirect());
        $this->assertEquals(3, $group->getMemberCount());
        $this->assertEquals($creator->id, $group->creator->id);

        // Test markAsReadForUser
        $group->markAsReadForUser($user1->id);
        $unread = $group->users()->where('users.id', $user1->id)->first()->pivot->unread_count;
        $this->assertEquals(0, $unread);
    }
}
