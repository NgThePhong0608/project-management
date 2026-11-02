<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\User;
use App\Services\DynamoDbService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Mockery\MockInterface;
use Tests\TestCase;

class ChatGroupAndUnreadApiTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;

    private User $user1;

    private User $user2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->creator = User::factory()->create();
        $this->user1 = User::factory()->create();
        $this->user2 = User::factory()->create();

        $this->mock(DynamoDbService::class, function (MockInterface $mock) {
            $mock->shouldReceive('putItem')->andReturn([]);
            $mock->shouldReceive('query')->andReturn(['items' => [], 'next_cursor' => null]);
        });
    }

    public function test_can_create_group_chat(): void
    {
        $response = $this->actingAs($this->creator)->postJson(route('chat.createGroup'), [
            'name' => 'Backend Engineers',
            'user_ids' => [$this->user1->id, $this->user2->id],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('conversation.name', 'Backend Engineers')
            ->assertJsonPath('conversation.type', Conversation::TYPE_GROUP);

        $this->assertDatabaseHas('conversations', [
            'name' => 'Backend Engineers',
            'type' => Conversation::TYPE_GROUP,
            'created_by' => $this->creator->id,
        ]);
    }

    public function test_create_group_validation_requires_name_and_user_ids(): void
    {
        $response = $this->actingAs($this->creator)->postJson(route('chat.createGroup'), [
            'name' => '',
            'user_ids' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'user_ids']);
    }

    public function test_cannot_create_group_with_only_self_in_user_ids(): void
    {
        $response = $this->actingAs($this->creator)->postJson(route('chat.createGroup'), [
            'name' => 'Solo Group',
            'user_ids' => [$this->creator->id],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['user_ids']);

        $this->assertDatabaseMissing('conversations', [
            'name' => 'Solo Group',
        ]);
    }

    public function test_sending_message_increments_unread_count_for_others(): void
    {
        Event::fake();

        $group = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => 'Sprint 1',
            'created_by' => $this->creator->id,
        ]);
        $group->users()->attach([
            $this->creator->id => ['unread_count' => 0],
            $this->user1->id => ['unread_count' => 0],
        ]);

        $this->actingAs($this->creator)->postJson(route('chat.sendMessage', $group), [
            'message' => 'Hello everyone!',
        ])->assertStatus(201);

        $user1Pivot = $group->users()->where('users.id', $this->user1->id)->first()->pivot;
        $creatorPivot = $group->users()->where('users.id', $this->creator->id)->first()->pivot;

        $this->assertEquals(1, $user1Pivot->unread_count);
        $this->assertEquals(0, $creatorPivot->unread_count);
    }

    public function test_mark_as_read_resets_unread_count(): void
    {
        $group = Conversation::create(['type' => Conversation::TYPE_GROUP, 'name' => 'Sprint 1']);
        $group->users()->attach([
            $this->user1->id => ['unread_count' => 5],
        ]);

        $this->actingAs($this->user1)->postJson(route('chat.markAsRead', $group))
            ->assertStatus(200);

        $user1Pivot = $group->users()->where('users.id', $this->user1->id)->first()->pivot;
        $this->assertEquals(0, $user1Pivot->unread_count);
    }

    public function test_get_global_unread_count(): void
    {
        $group1 = Conversation::create(['type' => Conversation::TYPE_GROUP, 'name' => 'Room 1']);
        $group2 = Conversation::create(['type' => Conversation::TYPE_GROUP, 'name' => 'Room 2']);
        $group1->users()->attach([$this->user1->id => ['unread_count' => 3]]);
        $group2->users()->attach([$this->user1->id => ['unread_count' => 4]]);

        $response = $this->actingAs($this->user1)->getJson(route('chat.unreadCount'));
        $response->assertStatus(200)
            ->assertJson(['unread_count' => 7]);
    }

    public function test_can_add_member_to_group(): void
    {
        $group = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => 'Design Team',
            'created_by' => $this->creator->id,
        ]);
        $group->users()->attach([
            $this->creator->id => ['unread_count' => 0],
        ]);

        $response = $this->actingAs($this->creator)->postJson(route('chat.addMember', $group), [
            'user_id' => $this->user1->id,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('conversation_user', [
            'conversation_id' => $group->id,
            'user_id' => $this->user1->id,
            'unread_count' => 0,
        ]);
    }

    public function test_can_remove_member_from_group(): void
    {
        $group = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => 'DevOps',
            'created_by' => $this->creator->id,
        ]);
        $group->users()->attach([
            $this->creator->id => ['unread_count' => 0],
            $this->user1->id => ['unread_count' => 0],
        ]);

        $response = $this->actingAs($this->creator)->deleteJson(route('chat.removeMember', [
            'conversation' => $group,
            'user' => $this->user1,
        ]));

        $response->assertStatus(200);

        $this->assertDatabaseMissing('conversation_user', [
            'conversation_id' => $group->id,
            'user_id' => $this->user1->id,
        ]);
    }

    public function test_user_can_leave_group(): void
    {
        $group = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => 'Random',
            'created_by' => $this->creator->id,
        ]);
        $group->users()->attach([
            $this->creator->id => ['unread_count' => 0],
            $this->user1->id => ['unread_count' => 0],
        ]);

        $response = $this->actingAs($this->user1)->deleteJson(route('chat.removeMember', [
            'conversation' => $group,
            'user' => $this->user1,
        ]));

        $response->assertStatus(200);

        $this->assertDatabaseMissing('conversation_user', [
            'conversation_id' => $group->id,
            'user_id' => $this->user1->id,
        ]);
    }

    public function test_cannot_add_or_remove_members_in_direct_chat(): void
    {
        $direct = Conversation::findOrCreateDirect($this->creator->id, $this->user1->id);

        $addResponse = $this->actingAs($this->creator)->postJson(route('chat.addMember', $direct), [
            'user_id' => $this->user2->id,
        ]);
        $addResponse->assertStatus(400);

        $removeResponse = $this->actingAs($this->creator)->deleteJson(route('chat.removeMember', [
            'conversation' => $direct,
            'user' => $this->user1,
        ]));
        $removeResponse->assertStatus(400);
    }
}
