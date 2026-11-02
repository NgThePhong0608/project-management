<?php

namespace Tests\Unit;

use App\Services\DynamoDbService;
use Aws\CommandInterface;
use Aws\DynamoDb\DynamoDbClient;
use Aws\DynamoDb\Exception\DynamoDbException;
use Mockery;
use Tests\TestCase;

class DynamoDbServiceTest extends TestCase
{
    public function test_table_exists_returns_true_when_described_successfully(): void
    {
        $mockClient = Mockery::mock(DynamoDbClient::class);
        $mockClient->shouldReceive('describeTable')
            ->once()
            ->with(['TableName' => 'chat_messages'])
            ->andReturn([]);

        $service = new DynamoDbService($mockClient);

        $this->assertTrue($service->tableExists('chat_messages'));
    }

    public function test_table_exists_returns_false_when_resource_not_found(): void
    {
        $mockClient = Mockery::mock(DynamoDbClient::class);
        $command = Mockery::mock(CommandInterface::class);

        $exception = new DynamoDbException(
            'Cannot find table',
            $command,
            ['code' => 'ResourceNotFoundException']
        );

        $mockClient->shouldReceive('describeTable')
            ->once()
            ->with(['TableName' => 'chat_messages'])
            ->andThrow($exception);

        $service = new DynamoDbService($mockClient);

        $this->assertFalse($service->tableExists('chat_messages'));
    }

    public function test_create_table_invokes_client_with_provisioned_capacity(): void
    {
        $mockClient = Mockery::mock(DynamoDbClient::class);
        $mockClient->shouldReceive('createTable')
            ->once()
            ->with(Mockery::on(function ($params) {
                return $params['TableName'] === 'chat_messages'
                    && $params['BillingMode'] === 'PROVISIONED'
                    && $params['ProvisionedThroughput']['ReadCapacityUnits'] === 5
                    && $params['ProvisionedThroughput']['WriteCapacityUnits'] === 5;
            }))
            ->andReturn([]);

        $service = new DynamoDbService($mockClient);

        $this->assertTrue($service->createTable('chat_messages'));
    }
}
