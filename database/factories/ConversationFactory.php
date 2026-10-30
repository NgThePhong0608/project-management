<?php

namespace Database\Factories;

use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'direct',
            'name' => null,
            'last_message_at' => now(),
        ];
    }

    public function group(?string $name = null): self
    {
        return $this->state(fn () => [
            'type' => 'group',
            'name' => $name ?? fake()->sentence(3),
        ]);
    }
}
