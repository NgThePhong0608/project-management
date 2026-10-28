<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectMemberRequest;
use App\Models\Project;
use App\Models\User;

class ProjectMemberController extends Controller
{
    public function store(StoreProjectMemberRequest $request, Project $project)
    {
        $role = $request->validated('role') ?? 'member';
        $existing = $project->members()->pluck('users.id')->all();

        $new = collect($request->validated('user_ids'))->unique()->diff($existing);
        $project->members()->attach(
            $new->mapWithKeys(fn ($id) => [$id => ['role' => $role, 'added_by' => $request->user()->id]])->all()
        );

        return back()->with('success', $new->count().' member(s) added to the project.');
    }

    public function destroy(Project $project, User $user)
    {
        $this->authorize('manageMembers', $project);

        $project->members()->detach($user->id);

        return back()->with('success', 'Member removed from the project.');
    }
}
