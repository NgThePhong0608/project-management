<?php

namespace App\Services;

use Aws\Credentials\Credentials;
use Aws\DynamoDb\DynamoDbClient;
use Aws\DynamoDb\Exception\DynamoDbException;
use Aws\DynamoDb\Marshaler;

class DynamoDbService
{
    protected ?DynamoDbClient $client = null;

    protected Marshaler $marshaler;

    public function __construct(?DynamoDbClient $client = null)
    {
        $this->marshaler = new Marshaler;

        if ($client) {
            $this->client = $client;

            return;
        }

        $region = config('services.aws.region', 'ap-southeast-1');
        $key = config('services.aws.key');
        $secret = config('services.aws.secret');
        $endpoint = config('services.dynamodb.endpoint');

        // Fallback to dummy credentials whenever local endpoint or mode=local has empty keys
        $isLocal = config('services.aws.mode', 'local') === 'local' || ! empty($endpoint);

        $config = [
            'region' => $region,
            'version' => 'latest',
        ];

        if (! empty($key) && ! empty($secret)) {
            $config['credentials'] = new Credentials($key, $secret);
        } elseif ($isLocal) {
            $config['credentials'] = new Credentials('dummyLocalKey', 'dummyLocalSecret');
        }
        // In live mode without explicit static keys, credentials are automatically resolved
        // by the AWS SDK default provider chain (ECS Task Role / IMDS / instance profile).

        if (! empty($endpoint)) {
            $config['endpoint'] = $endpoint;
        }

        $this->client = new DynamoDbClient($config);
    }

    public function getClient(): DynamoDbClient
    {
        return $this->client;
    }

    public function tableExists(string $tableName): bool
    {
        try {
            $this->client->describeTable(['TableName' => $tableName]);

            return true;
        } catch (DynamoDbException $e) {
            if ($e->getAwsErrorCode() === 'ResourceNotFoundException') {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Create a DynamoDB table with default Always Free capacity (5 RCU / 5 WCU).
     */
    public function createTable(string $tableName, array $options = []): bool
    {
        $pkName = $options['pk_name'] ?? 'PK';
        $pkType = $options['pk_type'] ?? 'S';
        $skName = $options['sk_name'] ?? 'SK';
        $skType = $options['sk_type'] ?? 'S';
        $rcu = $options['rcu'] ?? 5;
        $wcu = $options['wcu'] ?? 5;

        $params = [
            'TableName' => $tableName,
            'AttributeDefinitions' => [
                ['AttributeName' => $pkName, 'AttributeType' => $pkType],
                ['AttributeName' => $skName, 'AttributeType' => $skType],
            ],
            'KeySchema' => [
                ['AttributeName' => $pkName, 'KeyType' => 'HASH'],
                ['AttributeName' => $skName, 'KeyType' => 'RANGE'],
            ],
            'BillingMode' => 'PROVISIONED',
            'ProvisionedThroughput' => [
                'ReadCapacityUnits' => $rcu,
                'WriteCapacityUnits' => $wcu,
            ],
        ];

        try {
            $this->client->createTable($params);

            return true;
        } catch (DynamoDbException $e) {
            if ($e->getAwsErrorCode() === 'ResourceInUseException') {
                return true;
            }
            throw $e;
        }
    }

    public function putItem(string $tableName, array $item): void
    {
        $this->client->putItem([
            'TableName' => $tableName,
            'Item' => $this->marshaler->marshalItem($item),
        ]);
    }

    public function query(string $tableName, array $params): array
    {
        $params['TableName'] = $tableName;
        $result = $this->client->query($params);

        $items = [];
        foreach ($result['Items'] ?? [] as $rawItem) {
            $items[] = $this->marshaler->unmarshalItem($rawItem);
        }

        return [
            'items' => $items,
            'count' => $result['Count'] ?? 0,
            'last_evaluated_key' => isset($result['LastEvaluatedKey'])
                ? $this->marshaler->unmarshalItem($result['LastEvaluatedKey'])
                : null,
        ];
    }

    public function getMarshaler(): Marshaler
    {
        return $this->marshaler;
    }
}
