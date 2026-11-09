<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Services\BedrockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class TaskAiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_guest_cannot_access_ai_endpoints(): void
    {
        $breakdownResponse = $this->postJson(route('task.ai.breakdown'), [
            'title' => 'Test Task',
        ]);
        $breakdownResponse->assertUnauthorized();

        $enhanceResponse = $this->postJson(route('task.ai.enhance'), [
            'title' => 'Test Task',
            'description' => 'Test Description',
        ]);
        $enhanceResponse->assertUnauthorized();
    }

    public function test_validation_errors_when_required_fields_missing(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('task.ai.breakdown'), []);
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['title']);

        $response = $this->actingAs($this->user)->postJson(route('task.ai.enhance'), [
            'title' => 'Task without description',
        ]);
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['description']);
    }

    public function test_successful_task_breakdown_response(): void
    {
        $mockBedrock = Mockery::mock(BedrockService::class);
        $mockBedrock->shouldReceive('breakdownTask')
            ->once()
            ->with('Implement User Authentication', 'Add login and register', Mockery::any())
            ->andReturn([
                [
                    'name' => 'Design Auth Flow',
                    'description' => 'Diagram user authentication journeys',
                    'priority' => 'high',
                ],
                [
                    'name' => 'Build Login Form',
                    'description' => 'Create frontend form inputs',
                    'priority' => 'medium',
                ],
            ]);

        $this->app->instance(BedrockService::class, $mockBedrock);

        $response = $this->actingAs($this->user)->postJson(route('task.ai.breakdown'), [
            'title' => 'Implement User Authentication',
            'description' => 'Add login and register',
        ]);

        $response->assertOk();
        $response->assertJson([
            'subtasks' => [
                [
                    'name' => 'Design Auth Flow',
                    'description' => 'Diagram user authentication journeys',
                    'priority' => 'high',
                ],
                [
                    'name' => 'Build Login Form',
                    'description' => 'Create frontend form inputs',
                    'priority' => 'medium',
                ],
            ],
        ]);
    }

    public function test_successful_task_enhance_response(): void
    {
        $mockBedrock = Mockery::mock(BedrockService::class);
        $enhancedText = "### Context & Objective\nAdd search filter.\n\n### Implementation / Reproduction Steps\n1. Add input.\n\n### Acceptance Criteria (DoD)\n- Filter works.";

        $mockBedrock->shouldReceive('enhanceTaskDescription')
            ->once()
            ->with('Add search filter', 'Simple search', Mockery::any())
            ->andReturn($enhancedText);

        $this->app->instance(BedrockService::class, $mockBedrock);

        $response = $this->actingAs($this->user)->postJson(route('task.ai.enhance'), [
            'title' => 'Add search filter',
            'description' => 'Simple search',
        ]);

        $response->assertOk();
        $response->assertJson([
            'enhanced_description' => $enhancedText,
        ]);
    }

    public function test_project_context_is_retrieved_when_project_id_provided(): void
    {
        $project = Project::factory()->create([
            'name' => 'Project Alpha',
            'description' => 'Mission critical system',
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);

        $mockBedrock = Mockery::mock(BedrockService::class);
        $mockBedrock->shouldReceive('breakdownTask')
            ->once()
            ->with(
                'Setup CI/CD',
                null,
                Mockery::on(fn ($context) => str_contains($context, 'Project Alpha'))
            )
            ->andReturn([
                [
                    'name' => 'Setup Pipeline',
                    'description' => 'Configure GitHub actions',
                    'priority' => 'high',
                ],
            ]);

        $this->app->instance(BedrockService::class, $mockBedrock);

        $response = $this->actingAs($this->user)->postJson(route('task.ai.breakdown'), [
            'title' => 'Setup CI/CD',
            'project_id' => $project->id,
        ]);

        $response->assertOk();
        $response->assertJsonCount(1, 'subtasks');
    }

    public function test_non_member_cannot_access_private_project_context(): void
    {
        $otherOwner = User::factory()->create();
        $privateProject = Project::factory()->create([
            'name' => 'Secret Project',
            'description' => 'Confidential details',
            'created_by' => $otherOwner->id,
            'updated_by' => $otherOwner->id,
        ]);

        $this->actingAs($this->user)->postJson(route('task.ai.breakdown'), [
            'title' => 'Leak context',
            'project_id' => $privateProject->id,
        ])->assertForbidden();

        $this->actingAs($this->user)->postJson(route('task.ai.enhance'), [
            'title' => 'Leak context',
            'description' => 'Try to leak',
            'project_id' => $privateProject->id,
        ])->assertForbidden();
    }
}
