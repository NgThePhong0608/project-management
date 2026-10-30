<?php

namespace Tests\Feature\Chat;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Mockery;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_chat(): void
    {
        $response = $this->get(route('chat.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_access_chat_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('chat.index'));

        $response->assertOk();
    }

    public function test_user_cannot_view_messages_from_unauthorized_conversation(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $userC = User::factory()->create();

        $conversation = Conversation::findOrCreateDirect($userA->id, $userB->id);

        $response = $this->actingAs($userC)->getJson(route('chat.messages', $conversation));

        $response->assertForbidden();
    }

    public function test_user_cannot_send_message_to_unauthorized_conversation(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $userC = User::factory()->create();

        $conversation = Conversation::findOrCreateDirect($userA->id, $userB->id);

        $response = $this->actingAs($userC)->postJson(route('chat.sendMessage', $conversation), [
            'body' => 'I should not be allowed here!',
        ]);

        $response->assertForbidden();
    }

    public function test_user_can_send_message_successfully(): void
    {
        Event::fake([MessageSent::class]);

        $userA = User::factory()->create(['name' => 'Alice']);
        $userB = User::factory()->create(['name' => 'Bob']);

        $conversation = Conversation::findOrCreateDirect($userA->id, $userB->id);

        $mockChatService = Mockery::mock(ChatService::class);
        $expectedMessage = [
            'PK' => "CONV#{$conversation->id}",
            'SK' => 'MSG#2026-10-30T10:00:00Z#uuid',
            'id' => 'uuid-1234',
            'conversation_id' => $conversation->id,
            'user_id' => $userA->id,
            'user_name' => 'Alice',
            'user_email' => $userA->email,
            'avatar_url' => null,
            'body' => 'Hello Bob!',
            'created_at' => '2026-10-30T10:00:00Z',
        ];

        $mockChatService->shouldReceive('saveMessage')
            ->once()
            ->with($conversation->id, Mockery::type(User::class), 'Hello Bob!')
            ->andReturn($expectedMessage);

        $this->app->instance(ChatService::class, $mockChatService);

        $response = $this->actingAs($userA)->postJson(route('chat.sendMessage', $conversation), [
            'body' => 'Hello Bob!',
        ]);

        $response->assertCreated();
        $response->assertJson($expectedMessage);

        Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($expectedMessage) {
            return $event->message['body'] === $expectedMessage['body']
                && $event->broadcastOn()[0]->name === 'private-chat.'.$expectedMessage['conversation_id'];
        });

        $conversation->refresh();
        $this->assertNotNull($conversation->last_message_at);
    }

    public function test_start_direct_conversation_creates_and_redirects(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $response = $this->actingAs($userA)->post(route('chat.startDirect', $userB));

        $conversation = Conversation::forUser($userA->id)->first();
        $this->assertNotNull($conversation);

        $response->assertRedirect(route('chat.index', ['conversation' => $conversation->id]));
    }

    public function test_user_cannot_start_direct_conversation_with_self(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('chat.startDirect', $user));

        $response->assertStatus(400);
    }

    public function test_mark_as_read_updates_pivot_timestamp(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $conversation = Conversation::findOrCreateDirect($userA->id, $userB->id);
        $conversation->users()->updateExistingPivot($userA->id, ['last_read_at' => null]);

        $response = $this->actingAs($userA)->postJson(route('chat.markAsRead', $conversation));

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $userAPivot = $conversation->users()->where('users.id', $userA->id)->first()->pivot;
        $this->assertNotNull($userAPivot->last_read_at);
    }
}
