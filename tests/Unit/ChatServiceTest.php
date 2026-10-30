<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ChatService;
use App\Services\DynamoDbService;
use Aws\DynamoDb\Marshaler;
use Mockery;
use Tests\TestCase;

class ChatServiceTest extends TestCase
{
    public function test_save_message_puts_item_with_expected_keys(): void
    {
        $mockDynamo = Mockery::mock(DynamoDbService::class);
        $user = new User([
            'name' => 'Alice Doe',
            'email' => 'alice@example.com',
        ]);
        $user->id = 42;

        $mockDynamo->shouldReceive('putItem')
            ->once()
            ->with(
                'chat_messages',
                Mockery::on(function ($item) {
                    return $item['PK'] === 'CONV#10'
                        && str_starts_with($item['SK'], 'MSG#')
                        && $item['conversation_id'] === 10
                        && $item['user_id'] === 42
                        && $item['user_name'] === 'Alice Doe'
                        && $item['body'] === 'Hello from Unit Test!';
                })
            );

        $chatService = new ChatService($mockDynamo);
        $saved = $chatService->saveMessage(10, $user, 'Hello from Unit Test!');

        $this->assertEquals('CONV#10', $saved['PK']);
        $this->assertEquals(10, $saved['conversation_id']);
        $this->assertEquals(42, $saved['user_id']);
        $this->assertEquals('Hello from Unit Test!', $saved['body']);
    }

    public function test_get_messages_returns_chronological_order_and_cursor(): void
    {
        $mockDynamo = Mockery::mock(DynamoDbService::class);
        $marshaler = new Marshaler;

        $mockDynamo->shouldReceive('getMarshaler')->andReturn($marshaler);

        // DynamoDB returns newest first (item 2, then item 1)
        $queryResult = [
            'items' => [
                ['id' => 'msg-2', 'body' => 'Second message', 'created_at' => '2026-10-30T10:01:00Z'],
                ['id' => 'msg-1', 'body' => 'First message', 'created_at' => '2026-10-30T10:00:00Z'],
            ],
            'count' => 2,
            'last_evaluated_key' => ['PK' => 'CONV#10', 'SK' => 'MSG#2026-10-30T10:01:00Z#uuid'],
        ];

        $mockDynamo->shouldReceive('query')
            ->once()
            ->andReturn($queryResult);

        $chatService = new ChatService($mockDynamo);
        $result = $chatService->getMessages(10, 20);

        // After array_reverse, msg-1 is first, msg-2 is second
        $this->assertCount(2, $result['messages']);
        $this->assertEquals('First message', $result['messages'][0]['body']);
        $this->assertEquals('Second message', $result['messages'][1]['body']);
        $this->assertNotNull($result['next_cursor']);
    }
}
