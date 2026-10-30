<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class ChatService
{
    protected string $tableName;

    public function __construct(protected DynamoDbService $dynamoDbService)
    {
        $this->tableName = config('services.dynamodb.table_messages', 'chat_messages');
    }

    /**
     * Save a new message into DynamoDB.
     *
     * @return array<string, mixed>
     */
    public function saveMessage(int $conversationId, User $sender, string $body): array
    {
        $id = Str::uuid()->toString();
        $timestamp = now()->toISOString();

        $message = [
            'PK' => "CONV#{$conversationId}",
            'SK' => "MSG#{$timestamp}#{$id}",
            'id' => $id,
            'conversation_id' => $conversationId,
            'user_id' => $sender->id,
            'user_name' => $sender->name,
            'user_email' => $sender->email,
            'avatar_url' => $sender->avatar_url,
            'body' => $body,
            'created_at' => $timestamp,
        ];

        $this->dynamoDbService->putItem($this->tableName, $message);

        return $message;
    }

    /**
     * Retrieve messages for a conversation with cursor pagination.
     *
     * @param  array<string, mixed>|null  $exclusiveStartKey
     * @return array{messages: array<int, array<string, mixed>>, next_cursor: ?array<string, mixed>}
     */
    public function getMessages(int $conversationId, int $limit = 20, ?array $exclusiveStartKey = null): array
    {
        $marshaler = $this->dynamoDbService->getMarshaler();

        $params = [
            'KeyConditionExpression' => 'PK = :pk',
            'ExpressionAttributeValues' => $marshaler->marshalItem([
                ':pk' => "CONV#{$conversationId}",
            ]),
            'ScanIndexForward' => false, // Newest first
            'Limit' => $limit,
        ];

        if ($exclusiveStartKey) {
            $params['ExclusiveStartKey'] = $marshaler->marshalItem($exclusiveStartKey);
        }

        $result = $this->dynamoDbService->query($this->tableName, $params);

        // Sort chronologically ascending for standard chat timeline rendering
        $messages = array_reverse($result['items']);

        return [
            'messages' => $messages,
            'next_cursor' => $result['last_evaluated_key'],
        ];
    }

    public function getTableName(): string
    {
        return $this->tableName;
    }
}
