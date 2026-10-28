<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectMemberAndVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $manager;

    private User $outsider;

    private Project $project;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->manager = User::factory()->create(['role' => 'manager']);
        $this->outsider = User::factory()->create(['role' => 'member']);
        $this->project = Project::factory()->create(['created_by' => $this->manager->id, 'updated_by' => $this->manager->id]);
        $this->task = Task::factory()->create([
            'project_id' => $this->project->id,
            'created_by' => $this->manager->id,
            'updated_by' => $this->manager->id,
            'assigned_user_id' => User::factory()->create(['role' => 'member'])->id,
        ]);
    }

    public function test_outsider_gets_403_and_does_not_see_in_lists(): void
    {
        $this->actingAs($this->outsider)->get(route('project.show', $this->project))->assertForbidden();
        $this->actingAs($this->outsider)->get(route('task.show', $this->task))->assertForbidden();

        $this->actingAs($this->outsider)->get(route('project.index'))
            ->assertInertia(fn ($page) => $page->has('projects.data', 0));
        $this->actingAs($this->outsider)->get(route('task.index'))
            ->assertInertia(fn ($page) => $page->has('tasks.data', 0));
    }

    public function test_creator_can_add_member_who_then_sees_project_and_task(): void
    {
        $this->actingAs($this->manager)
            ->post(route('project.members.store', $this->project), ['user_ids' => [$this->outsider->id]])
            ->assertRedirect();

        $this->assertDatabaseHas('project_user', ['project_id' => $this->project->id, 'user_id' => $this->outsider->id, 'added_by' => $this->manager->id]);
        $this->actingAs($this->outsider)->get(route('project.show', $this->project))->assertOk();
        $this->actingAs($this->outsider)->get(route('task.show', $this->task))->assertOk();
    }

    public function test_non_manager_cannot_add_or_remove_members(): void
    {
        $this->actingAs($this->outsider)
            ->post(route('project.members.store', $this->project), ['user_ids' => [$this->outsider->id]])
            ->assertForbidden();

        $this->project->members()->attach($this->outsider->id);
        $this->actingAs($this->outsider)
            ->delete(route('project.members.destroy', [$this->project, $this->outsider]))
            ->assertForbidden();
    }

    public function test_admin_can_remove_member(): void
    {
        $this->project->members()->attach($this->outsider->id);
        $this->actingAs($this->admin)
            ->delete(route('project.members.destroy', [$this->project, $this->outsider]))
            ->assertRedirect();
        $this->assertDatabaseMissing('project_user', ['user_id' => $this->outsider->id]);
    }

    public function test_outsider_cannot_view_project_without_joining(): void
    {
        $this->task->update(['assigned_user_id' => $this->outsider->id]);
        $this->actingAs($this->outsider)->get(route('project.show', $this->project))->assertForbidden();
    }

    public function test_show_pages_expose_members_comments_and_mentionable(): void
    {
        $this->project->members()->attach($this->outsider->id);
        $this->project->comments()->create(['user_id' => $this->manager->id, 'body' => 'hello']);

        $this->actingAs($this->manager)->get(route('project.show', $this->project))
            ->assertInertia(fn ($p) => $p->has('members', 1)->has('comments', 1)->has('mentionable', 2)
                ->where('project.can.manageMembers', true));

        $this->actingAs($this->outsider)->get(route('project.show', $this->project))
            ->assertInertia(fn ($p) => $p->has('candidates', 0)->where('project.can.manageMembers', false));

        $this->actingAs($this->outsider)->get(route('task.show', $this->task))
            ->assertInertia(fn ($p) => $p->has('comments', 0)->has('mentionable'));
    }
}
