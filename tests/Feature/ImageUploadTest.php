<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = User::factory()->create(['role' => 'manager']);
        Storage::fake();
    }

    public function test_project_image_can_be_uploaded_and_replaced(): void
    {
        $project = Project::factory()->create([
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
            'image_path' => null,
        ]);

        $file1 = UploadedFile::fake()->image('project1.png');
        $response = $this->actingAs($this->manager)->post(route('project.update', $project), [
            '_method' => 'put',
            'name' => $project->name,
            'status' => $project->status,
            'image' => $file1,
        ]);

        $response->assertRedirect(route('project.index'));
        $project->refresh();
        $this->assertNotNull($project->image_path);
        Storage::assertExists($project->image_path);

        $oldPath = $project->image_path;

        // Replace with new image
        $file2 = UploadedFile::fake()->image('project2.png');
        $this->actingAs($this->manager)->post(route('project.update', $project), [
            '_method' => 'put',
            'name' => $project->name,
            'status' => $project->status,
            'image' => $file2,
        ]);

        $project->refresh();
        $this->assertNotEquals($oldPath, $project->image_path);
        Storage::assertExists($project->image_path);
        Storage::assertMissing($oldPath);
    }

    public function test_task_image_stored_under_task_prefix(): void
    {
        $project = Project::factory()->create([
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
        ]);

        $file = UploadedFile::fake()->image('task.png');
        $response = $this->actingAs($this->manager)->post(route('task.store'), [
            'name' => 'Task With Image',
            'status' => 'pending',
            'priority' => 'low',
            'project_id' => $project->id,
            'assigned_user_id' => $this->manager->id,
            'image' => $file,
        ]);

        $response->assertRedirect(route('project.index'));
        $task = Task::where('name', 'Task With Image')->first();
        $this->assertNotNull($task);
        $this->assertStringStartsWith('task/', $task->image_path);
        Storage::assertExists($task->image_path);
    }

    public function test_task_edit_page_renders_with_project_id_assigned_user_id_and_image_name(): void
    {
        $project = Project::factory()->create([
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
        ]);
        $project->members()->attach($this->manager->id, ['role' => 'manager']);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $this->manager->id,
            'created_by' => $this->manager->id,
            'image_path' => 'task/sample/my_photo.png',
        ]);

        $response = $this->actingAs($this->manager)->get(route('task.edit', $task->id));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Task/Edit')
            ->where('task.id', $task->id)
            ->where('task.project_id', $project->id)
            ->where('task.assigned_user_id', $this->manager->id)
            ->where('task.image_name', 'my_photo.png')
        );
    }
}
