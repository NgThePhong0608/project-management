<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase1SmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_relations_and_scopes(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $assignee = User::factory()->create();
        $outsider = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $project = Project::factory()->create(['created_by' => $owner->id, 'updated_by' => $owner->id]);
        $project->members()->attach($member->id, ['role' => 'member']);
        $project->members()->attach($assignee->id, ['role' => 'member']);
        $task = Task::factory()->create(['project_id' => $project->id, 'assigned_user_id' => $assignee->id, 'created_by' => $owner->id, 'updated_by' => $owner->id]);

        foreach ([$owner, $member, $assignee, $admin] as $u) {
            $this->assertTrue(Project::visibleTo($u)->whereKey($project->id)->exists());
        }
        $this->assertFalse(Project::visibleTo($outsider)->exists());

        foreach ([$owner, $member, $assignee, $admin] as $u) {
            $this->assertTrue(Task::visibleTo($u)->whereKey($task->id)->exists());
        }
        $this->assertFalse(Task::visibleTo($outsider)->exists());
        $this->assertTrue($project->isMember($member));
        $this->assertTrue($task->isParticipant($member));
        $this->assertFalse($task->isParticipant($outsider));

        $c = $task->comments()->create(['user_id' => $member->id, 'body' => 'hi']);
        $r = $project->comments()->create(['user_id' => $owner->id, 'body' => 'x']);
        $reply = Comment::create(['user_id' => $owner->id, 'commentable_type' => $task->getMorphClass(), 'commentable_id' => $task->id, 'parent_id' => $c->id, 'body' => 'yo']);
        $c->mentions()->create(['user_id' => $owner->id]);
        $this->assertCount(1, $c->replies);
        $this->assertCount(1, $c->mentions);
        $this->assertTrue($c->commentable->is($task));
    }
}
