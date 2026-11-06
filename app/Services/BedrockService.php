<?php

namespace App\Services;

use Aws\BedrockRuntime\BedrockRuntimeClient;
use Illuminate\Support\Facades\Log;
use Throwable;

class BedrockService
{
    protected ?BedrockRuntimeClient $client;

    public function __construct(?BedrockRuntimeClient $client = null)
    {
        if ($client !== null) {
            $this->client = $client;
        } else {
            $credentials = array_filter([
                'key' => config('services.aws.key'),
                'secret' => config('services.aws.secret'),
            ]);
            $region = config('services.bedrock.region', 'us-east-1');

            $config = [
                'region' => $region,
                'version' => 'latest',
            ];

            if (! empty($credentials['key']) && ! empty($credentials['secret'])) {
                $config['credentials'] = $credentials;
            }

            $this->client = new BedrockRuntimeClient($config);
        }
    }

    public function getClient(): ?BedrockRuntimeClient
    {
        return $this->client;
    }

    public function converse(array $messages, string $system = '', ?string $modelId = null): string
    {
        $params = [
            'modelId' => $modelId ?: config('services.bedrock.model_id', 'anthropic.claude-3-5-haiku-20241022-v1:0'),
            'messages' => $messages,
        ];

        if (! empty($system)) {
            $params['system'] = [
                ['text' => $system],
            ];
        }

        try {
            $result = $this->client->converse($params);

            return $result['output']['message']['content'][0]['text'] ?? '';
        } catch (Throwable $e) {
            Log::error('Bedrock converse error: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return '';
        }
    }

    public function breakdownTask(string $title, ?string $description = null, ?string $projectContext = null): array
    {
        $prompt = "Break down the following task into 3 to 6 logical, actionable subtasks.\n\nTask Title: {$title}\n";
        if (! empty($description)) {
            $prompt .= "Description: {$description}\n";
        }
        if (! empty($projectContext)) {
            $prompt .= "Project Context: {$projectContext}\n";
        }
        $prompt .= "\nReturn ONLY a valid JSON array of objects without any markdown formatting or extra text. Each object must have these exact keys:\n";
        $prompt .= "- \"name\": A concise subtask title (string)\n";
        $prompt .= "- \"description\": A brief summary of what needs to be done (string)\n";
        $prompt .= "- \"priority\": Either \"high\", \"medium\", or \"low\" (string)\n\n";
        $prompt .= "Example format:\n[{\"name\": \"Database schema migration\", \"description\": \"Create migration for tasks table\", \"priority\": \"high\"}]";

        $system = 'You are an expert Agile project management assistant. Always output valid JSON strictly conforming to the requested schema with no commentary or markdown fences.';

        $messages = [
            [
                'role' => 'user',
                'content' => [
                    ['text' => $prompt],
                ],
            ],
        ];

        $rawResponse = $this->converse($messages, $system);

        return $this->parseSubtasksJson($rawResponse, $title);
    }

    public function enhanceTaskDescription(string $title, string $rawDescription, ?string $projectContext = null): string
    {
        $prompt = "Enhance and enrich the following task description into a professional Agile user story specification.\n\n";
        $prompt .= "Task Title: {$title}\n";
        $prompt .= "Original Description: {$rawDescription}\n";
        if (! empty($projectContext)) {
            $prompt .= "Project Context: {$projectContext}\n";
        }
        $prompt .= "\nFormat the response using standard Markdown with the following exact section headings:\n";
        $prompt .= "### Context & Objective\n";
        $prompt .= "### Implementation / Reproduction Steps\n";
        $prompt .= "### Acceptance Criteria (DoD)\n\n";
        $prompt .= 'Write clear, actionable bullet points under each heading. Do not include extraneous conversational text.';

        $system = 'You are a senior technical product manager. Provide well-structured Agile task descriptions in Markdown.';

        $messages = [
            [
                'role' => 'user',
                'content' => [
                    ['text' => $prompt],
                ],
            ],
        ];

        $enhanced = $this->converse($messages, $system);

        return ! empty(trim($enhanced)) ? trim($enhanced) : $rawDescription;
    }

    public function parseSubtasksJson(string $rawResponse, string $taskTitle): array
    {
        $text = trim($rawResponse);

        // Strip markdown code blocks like ```json ... ``` or ``` ... ```
        if (preg_match('/^```(?:json)?\s*(.*?)\s*```$/is', $text, $matches)) {
            $text = trim($matches[1]);
        } elseif (preg_match('/\[\s*\{.*\}\s*\]/is', $text, $matches)) {
            $text = trim($matches[0]);
        }

        $decoded = json_decode($text, true);

        if (is_array($decoded) && ! empty($decoded)) {
            $subtasks = [];
            foreach ($decoded as $item) {
                if (is_array($item) && ! empty($item['name'])) {
                    $priority = strtolower($item['priority'] ?? 'medium');
                    if (! in_array($priority, ['high', 'medium', 'low'], true)) {
                        $priority = 'medium';
                    }

                    $subtasks[] = [
                        'name' => (string) $item['name'],
                        'description' => (string) ($item['description'] ?? ''),
                        'priority' => $priority,
                    ];
                }
            }

            if (! empty($subtasks)) {
                return $subtasks;
            }
        }

        return $this->fallbackSubtasks($taskTitle);
    }

    public function fallbackSubtasks(string $taskTitle): array
    {
        return [
            [
                'name' => 'Initial Planning & Requirements',
                'description' => "Review specifications and clarify scope for {$taskTitle}.",
                'priority' => 'high',
            ],
            [
                'name' => 'Core Implementation',
                'description' => "Execute key components and logic for {$taskTitle}.",
                'priority' => 'medium',
            ],
            [
                'name' => 'Testing & QA Validation',
                'description' => 'Verify functionality, test edge cases, and ensure acceptance criteria are met.',
                'priority' => 'low',
            ],
        ];
    }
}
