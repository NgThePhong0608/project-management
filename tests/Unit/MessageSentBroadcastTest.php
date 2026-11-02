<?php

namespace Tests\Unit;

use App\Events\MessageSent;
use Tests\TestCase;

class MessageSentBroadcastTest extends TestCase
{
    public function test_message_sent_broadcasts_strictly_on_recipient_user_channels(): void
    {
        $message = [
            'id' => 'MSG#123',
            'conversation_id' => 10,
            'sender_id' => 1,
            'message' => 'Hello team',
            'created_at' => now()->toISOString(),
        ];
        $conversationData = [
            'id' => 10,
            'type' => 'group',
            'name' => 'Design Team',
        ];
        $recipientIds = [2, 3, 4];

        $event = new MessageSent($message, $conversationData, $recipientIds);
        $channels = $event->broadcastOn();

        $channelNames = array_map(fn ($c) => $c->name, $channels);

        // Security requirement: messages broadcast strictly to recipient user channels, NOT conversation channel
        $this->assertNotContains('private-chat.10', $channelNames);
        $this->assertContains('private-App.Models.User.2', $channelNames);
        $this->assertContains('private-App.Models.User.3', $channelNames);
        $this->assertContains('private-App.Models.User.4', $channelNames);
        $this->assertNotContains('private-App.Models.User.1', $channelNames); // Sender not in recipients
    }

    public function test_message_sent_broadcast_with_includes_message_and_conversation(): void
    {
        $message = [
            'id' => 'MSG#123',
            'conversation_id' => 10,
            'sender_id' => 1,
            'message' => 'Hello team',
        ];
        $conversationData = [
            'id' => 10,
            'type' => 'group',
            'name' => 'Design Team',
        ];
        $recipientIds = [2];

        $event = new MessageSent($message, $conversationData, $recipientIds);
        $payload = $event->broadcastWith();

        $this->assertSame($message, $payload['message']);
        $this->assertSame($conversationData, $payload['conversation']);
    }
}
