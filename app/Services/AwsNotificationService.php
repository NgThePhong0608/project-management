<?php

namespace App\Services;

use Aws\CloudWatchLogs\CloudWatchLogsClient;
use Aws\CloudWatchLogs\Exception\CloudWatchLogsException;
use Aws\Sns\Exception\SnsException;
use Aws\Sns\SnsClient;
use Illuminate\Support\Facades\Log;
use Throwable;

class AwsNotificationService
{
    protected ?SnsClient $snsClient = null;

    protected ?CloudWatchLogsClient $cwClient = null;

    protected static bool $streamInitialized = false;

    public function __construct()
    {
        $credentials = [
            'key' => config('services.aws.key'),
            'secret' => config('services.aws.secret'),
        ];
        $region = config('services.aws.region', 'ap-southeast-1');

        if (! empty($credentials['key']) && ! empty($credentials['secret'])) {
            $this->snsClient = new SnsClient([
                'region' => $region,
                'version' => 'latest',
                'credentials' => $credentials,
            ]);

            $this->cwClient = new CloudWatchLogsClient([
                'region' => $region,
                'version' => 'latest',
                'credentials' => $credentials,
            ]);
        }
    }

    /**
     * Publish an event to the AWS SNS Topic.
     *
     * @param  array<string, mixed>  $data
     */
    public function publish(string $subject, array $data): ?string
    {
        $topicArn = config('services.aws.sns_topic_arn');

        if (! $this->snsClient || empty($topicArn)) {
            Log::warning('AWS SNS client not configured or missing topic ARN.');

            return null;
        }

        try {
            $payload = json_encode($data);
            $result = $this->snsClient->publish([
                'TopicArn' => $topicArn,
                'Subject' => substr($subject, 0, 100),
                'Message' => $payload,
            ]);

            $messageId = $result->get('MessageId');

            // Log successful SNS publish to CloudWatch
            $this->logToCloudWatch('SNS_MESSAGE_PUBLISHED', [
                'message_id' => $messageId,
                'topic_arn' => $topicArn,
                'subject' => $subject,
                'payload' => $data,
            ]);

            return $messageId;
        } catch (SnsException|Throwable $e) {
            Log::error('Failed to publish message to AWS SNS: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            $this->logToCloudWatch('SNS_PUBLISH_FAILED', [
                'subject' => $subject,
                'error' => $e->getMessage(),
            ], 'ERROR');

            return null;
        }
    }

    /**
     * Write an audit log entry to AWS CloudWatch Logs.
     *
     * @param  array<string, mixed>  $context
     */
    public function logToCloudWatch(string $eventName, array $context, string $level = 'INFO'): bool
    {
        $logGroup = config('services.aws.cloudwatch_log_group', '/pm-app/dev');
        $logStream = config('services.aws.cloudwatch_log_stream', 'notifications');

        if (! $this->cwClient || empty($logGroup)) {
            return false;
        }

        $this->ensureLogStreamExists($logGroup, $logStream);

        try {
            $logEntry = [
                'timestamp' => now()->toIso8601String(),
                'level' => $level,
                'event' => $eventName,
                'context' => $context,
            ];

            $this->cwClient->putLogEvents([
                'logGroupName' => $logGroup,
                'logStreamName' => $logStream,
                'logEvents' => [
                    [
                        'message' => json_encode($logEntry),
                        'timestamp' => (int) round(microtime(true) * 1000),
                    ],
                ],
            ]);

            return true;
        } catch (CloudWatchLogsException|Throwable $e) {
            Log::warning('Failed to write log to AWS CloudWatch: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Ensure the target CloudWatch log stream exists.
     */
    protected function ensureLogStreamExists(string $logGroup, string $logStream): void
    {
        if (self::$streamInitialized || ! $this->cwClient) {
            return;
        }

        try {
            $this->cwClient->createLogStream([
                'logGroupName' => $logGroup,
                'logStreamName' => $logStream,
            ]);
            self::$streamInitialized = true;
        } catch (CloudWatchLogsException $e) {
            // ResourceAlreadyExistsException is expected if the stream already exists
            if ($e->getAwsErrorCode() === 'ResourceAlreadyExistsException') {
                self::$streamInitialized = true;
            }
        } catch (Throwable $e) {
            Log::warning('Could not verify/create CloudWatch log stream: '.$e->getMessage());
        }
    }
}
