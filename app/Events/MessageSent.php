<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $message
     * @param  array<string, mixed>  $conversation
     * @param  array<int>  $recipientIds
     */
    public function __construct(
        public array $message,
        public array $conversation = [],
        public array $recipientIds = []
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * Deliver message content strictly to active participants' per-user private channels.
     * Prevents removed participants with open chat tabs from continuing to receive messages.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        foreach ($this->recipientIds as $recipientId) {
            $channels[] = new PrivateChannel('App.Models.User.'.$recipientId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'conversation' => $this->conversation,
        ];
    }
}
