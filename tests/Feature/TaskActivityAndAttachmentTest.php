<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaskActivityAndAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_and_updating_task_records_structured_activities(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $member = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach($member->id, ['role' => 'member', 'added_by' => $manager->id]);

        $this->actingAs($manager)->post(route('task.store'), [
            'name' => 'Audit Log Task',
            'status' => 'pending',
            'priority' => 'medium',
            'project_id' => $project->id,
            'assigned_user_id' => $member->id,
        ])->assertRedirect(route('project.index'));

        $task = Task::where('name', 'Audit Log Task')->firstOrFail();

        $this->assertDatabaseHas('task_activities', [
            'task_id' => $task->id,
            'user_id' => $manager->id,
            'action' => 'created',
        ]);

        $this->actingAs($member)->put(route('task.update', $task), [
            'name' => 'Audit Log Task',
            'status' => 'in_progress',
            'priority' => 'high',
            'project_id' => $project->id,
            'assigned_user_id' => $member->id,
        ])->assertRedirect(route('task.index'));

        $updateActivity = TaskActivity::where('task_id', $task->id)
            ->where('action', 'updated')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame('Pending', $updateActivity->changes['status']['old']);
        $this->assertSame('In Progress', $updateActivity->changes['status']['new']);
        $this->assertSame('Medium', $updateActivity->changes['priority']['old']);
        $this->assertSame('High', $updateActivity->changes['priority']['new']);
    }

    public function test_assignee_can_upload_download_and_delete_attachment(): void
    {
        Storage::fake(config('filesystems.default'));

        $manager = User::factory()->create(['role' => 'manager']);
        $assignee = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach($assignee->id, ['role' => 'member', 'added_by' => $manager->id]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $file = UploadedFile::fake()->create('spec.pdf', 120, 'application/pdf');

        $this->actingAs($assignee)
            ->post(route('task.attachments.store', $task), ['file' => $file])
            ->assertRedirect();

        $attachment = TaskAttachment::where('task_id', $task->id)->firstOrFail();
        $this->assertSame('spec.pdf', $attachment->original_name);
        Storage::disk($attachment->disk)->assertExists($attachment->path);

        $this->assertDatabaseHas('task_activities', [
            'task_id' => $task->id,
            'action' => 'attachment_added',
        ]);

        $this->actingAs($assignee)
            ->get(route('task.attachments.download', [$task, $attachment]))
            ->assertOk();

        $this->actingAs($assignee)
            ->delete(route('task.attachments.destroy', [$task, $attachment]))
            ->assertRedirect();

        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);
        Storage::disk($attachment->disk)->assertMissing($attachment->path);
        $this->assertDatabaseHas('task_activities', [
            'task_id' => $task->id,
            'action' => 'attachment_removed',
        ]);
    }

    public function test_attachment_authorization_and_cross_task_idor_guards(): void
    {
        Storage::fake(config('filesystems.default'));

        $manager = User::factory()->create(['role' => 'manager']);
        $assignee = User::factory()->create(['role' => 'member']);
        $otherMember = User::factory()->create(['role' => 'member']);
        $outsider = User::factory()->create(['role' => 'member']);

        $project = Project::factory()->create(['created_by' => $manager->id]);
        $project->members()->attach([
            $assignee->id => ['role' => 'member', 'added_by' => $manager->id],
            $otherMember->id => ['role' => 'member', 'added_by' => $manager->id],
        ]);

        $taskA = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);
        $taskB = Task::factory()->create([
            'project_id' => $project->id,
            'assigned_user_id' => $assignee->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $disk = config('filesystems.default');
        Storage::disk($disk)->put('task-attachments/b/file.txt', 'hello');
        $attachmentB = TaskAttachment::create([
            'task_id' => $taskB->id,
            'user_id' => $assignee->id,
            'disk' => $disk,
            'path' => 'task-attachments/b/file.txt',
            'original_name' => 'file.txt',
            'mime_type' => 'text/plain',
            'size' => 5,
        ]);

        $this->actingAs($otherMember)
            ->post(route('task.attachments.store', $taskA), [
                'file' => UploadedFile::fake()->create('note.txt', 10, 'text/plain'),
            ])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->get(route('task.attachments.download', [$taskB, $attachmentB]))
            ->assertForbidden();

        $this->actingAs($assignee)
            ->get(route('task.attachments.download', [$taskA, $attachmentB]))
            ->assertNotFound();
    }
}
