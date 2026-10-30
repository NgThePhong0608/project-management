<?php

namespace Tests\Unit;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_conversation_belongs_to_many_users(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $conversation = Conversation::factory()->create();
        $conversation->users()->attach([
            $user1->id => ['last_read_at' => now()],
            $user2->id => ['last_read_at' => null],
        ]);

        $this->assertCount(2, $conversation->users);
        $this->assertTrue($conversation->isParticipant($user1->id));
        $this->assertTrue($conversation->isParticipant($user2->id));
    }

    public function test_get_partner_returns_other_user(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $conversation = Conversation::factory()->create(['type' => 'direct']);
        $conversation->users()->attach([$user1->id, $user2->id]);

        $conversation->load('users');

        $partnerForUser1 = $conversation->getPartner($user1->id);
        $partnerForUser2 = $conversation->getPartner($user2->id);

        $this->assertNotNull($partnerForUser1);
        $this->assertEquals($user2->id, $partnerForUser1->id);

        $this->assertNotNull($partnerForUser2);
        $this->assertEquals($user1->id, $partnerForUser2->id);
    }

    public function test_mark_as_read_updates_pivot_timestamp(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create();
        $conversation->users()->attach($user->id, ['last_read_at' => null]);

        $this->assertNull($conversation->users()->first()->pivot->last_read_at);

        $conversation->markAsRead($user->id);

        $updated = $conversation->users()->where('users.id', $user->id)->first();
        $this->assertNotNull($updated->pivot->last_read_at);
    }

    public function test_find_or_create_direct_reuses_existing_conversation(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $conv1 = Conversation::findOrCreateDirect($user1->id, $user2->id);
        $conv2 = Conversation::findOrCreateDirect($user2->id, $user1->id);

        $this->assertEquals($conv1->id, $conv2->id);
        $this->assertEquals('direct', $conv1->type);
        $this->assertCount(2, $conv1->users);
    }

    public function test_scope_for_user_filters_correct_conversations(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $user3 = User::factory()->create();

        $conv12 = Conversation::findOrCreateDirect($user1->id, $user2->id);
        $conv23 = Conversation::findOrCreateDirect($user2->id, $user3->id);

        $user1Conversations = Conversation::forUser($user1->id)->get();
        $user2Conversations = Conversation::forUser($user2->id)->get();

        $this->assertCount(1, $user1Conversations);
        $this->assertEquals($conv12->id, $user1Conversations->first()->id);

        $this->assertCount(2, $user2Conversations);
    }
}
