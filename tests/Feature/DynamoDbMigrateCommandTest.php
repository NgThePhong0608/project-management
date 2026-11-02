<?php

namespace Tests\Feature;

use App\Services\DynamoDbService;
use Mockery;
use Tests\TestCase;

class DynamoDbMigrateCommandTest extends TestCase
{
    public function test_dynamodb_migrate_creates_missing_table(): void
    {
        $mockDynamo = Mockery::mock(DynamoDbService::class);

        $mockDynamo->shouldReceive('tableExists')
            ->with('chat_messages')
            ->once()
            ->andReturn(false);

        $mockDynamo->shouldReceive('createTable')
            ->with('chat_messages', Mockery::type('array'))
            ->once()
            ->andReturn(true);

        $this->app->instance(DynamoDbService::class, $mockDynamo);

        $this->artisan('dynamodb:migrate')
            ->expectsOutputToContain('Creating DynamoDB table: chat_messages...')
            ->expectsOutputToContain('Created table: chat_messages successfully.')
            ->assertSuccessful();
    }

    public function test_dynamodb_migrate_skips_existing_table(): void
    {
        $mockDynamo = Mockery::mock(DynamoDbService::class);

        $mockDynamo->shouldReceive('tableExists')
            ->with('chat_messages')
            ->once()
            ->andReturn(true);

        $mockDynamo->shouldNotReceive('createTable');

        $this->app->instance(DynamoDbService::class, $mockDynamo);

        $this->artisan('dynamodb:migrate')
            ->expectsOutputToContain('Table already exists: chat_messages. Skipping.')
            ->assertSuccessful();
    }
}
