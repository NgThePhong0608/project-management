<?php

namespace Tests\Unit\Services;

use App\Services\BedrockService;
use Aws\BedrockRuntime\BedrockRuntimeClient;
use Aws\Result;
use Mockery;
use Tests\TestCase;

class BedrockServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_breakdown_task_returns_parsed_array_from_clean_json(): void
    {
        $mockClient = Mockery::mock(BedrockRuntimeClient::class);

        $jsonPayload = json_encode([
            [
                'name' => 'Database migration',
                'description' => 'Create tasks table migration',
                'priority' => 'high',
            ],
            [
                'name' => 'Model relations',
                'description' => 'Define belongsTo relationships',
                'priority' => 'medium',
            ],
        ]);

        $mockClient->shouldReceive('converse')
            ->once()
            ->andReturn(new Result([
                'output' => [
                    'message' => [
                        'content' => [
                            ['text' => $jsonPayload],
                        ],
                    ],
                ],
            ]));

        $service = new BedrockService($mockClient);
        $subtasks = $service->breakdownTask('Implement Task Feature', 'Create task CRUD');

        $this->assertCount(2, $subtasks);
        $this->assertSame('Database migration', $subtasks[0]['name']);
        $this->assertSame('high', $subtasks[0]['priority']);
        $this->assertSame('Model relations', $subtasks[1]['name']);
    }

    public function test_breakdown_task_strips_markdown_code_fences(): void
    {
        $mockClient = Mockery::mock(BedrockRuntimeClient::class);

        $jsonPayload = "```json\n".json_encode([
            [
                'name' => 'API Controller',
                'description' => 'Build REST endpoint',
                'priority' => 'high',
            ],
        ])."\n```";

        $mockClient->shouldReceive('converse')
            ->once()
            ->andReturn(new Result([
                'output' => [
                    'message' => [
                        'content' => [
                            ['text' => $jsonPayload],
                        ],
                    ],
                ],
            ]));

        $service = new BedrockService($mockClient);
        $subtasks = $service->breakdownTask('API Feature');

        $this->assertCount(1, $subtasks);
        $this->assertSame('API Controller', $subtasks[0]['name']);
        $this->assertSame('high', $subtasks[0]['priority']);
    }

    public function test_breakdown_task_returns_safe_fallback_on_invalid_json(): void
    {
        $mockClient = Mockery::mock(BedrockRuntimeClient::class);

        $mockClient->shouldReceive('converse')
            ->once()
            ->andReturn(new Result([
                'output' => [
                    'message' => [
                        'content' => [
                            ['text' => 'This is not valid json at all.'],
                        ],
                    ],
                ],
            ]));

        $service = new BedrockService($mockClient);
        $subtasks = $service->breakdownTask('Refactor Auth');

        $this->assertNotEmpty($subtasks);
        $this->assertCount(3, $subtasks);
        $this->assertSame('Initial Planning & Requirements', $subtasks[0]['name']);
        $this->assertSame('high', $subtasks[0]['priority']);
    }

    public function test_enhance_task_description_returns_formatted_text(): void
    {
        $mockClient = Mockery::mock(BedrockRuntimeClient::class);

        $enhancedText = "### Context & Objective\nImprove user onboarding.\n\n### Implementation / Reproduction Steps\n1. Add modal.\n\n### Acceptance Criteria (DoD)\n- Modal closes on escape.";

        $mockClient->shouldReceive('converse')
            ->once()
            ->andReturn(new Result([
                'output' => [
                    'message' => [
                        'content' => [
                            ['text' => $enhancedText],
                        ],
                    ],
                ],
            ]));

        $service = new BedrockService($mockClient);
        $result = $service->enhanceTaskDescription('User onboarding', 'Simple onboarding');

        $this->assertSame($enhancedText, $result);
    }

    public function test_enhance_task_description_returns_fallback_raw_when_empty(): void
    {
        $mockClient = Mockery::mock(BedrockRuntimeClient::class);

        $mockClient->shouldReceive('converse')
            ->once()
            ->andReturn(new Result([
                'output' => [
                    'message' => [
                        'content' => [
                            ['text' => ''],
                        ],
                    ],
                ],
            ]));

        $service = new BedrockService($mockClient);
        $original = 'Raw task description here';
        $result = $service->enhanceTaskDescription('Task Title', $original);

        $this->assertSame($original, $result);
    }
}
