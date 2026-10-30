<?php

namespace App\Console\Commands;

use App\Services\DynamoDbService;
use Illuminate\Console\Command;
use Throwable;

class DynamoDbMigrateCommand extends Command
{
    protected $signature = 'dynamodb:migrate';

    protected $description = 'Check and automatically initialize the necessary DynamoDB tables.';

    public function handle(DynamoDbService $dynamoDbService): int
    {
        $this->info('Starting DynamoDB migrations...');

        $tables = config('services.dynamodb.tables', [
            'chat_messages' => [
                'pk_name' => 'PK',
                'pk_type' => 'S',
                'sk_name' => 'SK',
                'sk_type' => 'S',
                'rcu' => 5,
                'wcu' => 5,
            ],
        ]);

        foreach ($tables as $tableName => $schema) {
            try {
                if (! $dynamoDbService->tableExists($tableName)) {
                    $this->info("Creating DynamoDB table: {$tableName}...");
                    $dynamoDbService->createTable($tableName, $schema);
                    $this->info("Created table: {$tableName} successfully.");
                } else {
                    $this->line("Table already exists: {$tableName}. Skipping.");
                }
            } catch (Throwable $e) {
                $this->error("Failed to migrate table [{$tableName}]: {$e->getMessage()}");

                return self::FAILURE;
            }
        }

        $this->info('DynamoDB migrations completed successfully.');

        return self::SUCCESS;
    }
}
