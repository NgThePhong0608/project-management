<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\CommentResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Project::class, 'project');
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth()->user();
        $query = Project::query()
            ->visibleTo($user)
            ->with(['createdBy', 'updatedBy', 'members:id,name,email,role,avatar_path'])
            ->withCount(['members', 'tasks']);

        $sortField = request('sort_field', 'created_at');
        $sortDirection = request('sort_direction', 'desc');
        if (request('name')) {
            $query->where('name', 'like', '%'.request('name').'%');
        }
        if (request('status')) {
            $query->where('status', request('status'));
        }
        if (request('scope') === 'owned') {
            $query->where('projects.created_by', $user->id);
        } elseif (request('scope') === 'managed') {
            $query->where(function ($q) use ($user) {
                $q->where('projects.created_by', $user->id)
                    ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id)->where('project_user.role', 'manager'));
            });
        } elseif (request('scope') === 'joined') {
            $query->whereHas('members', fn ($m) => $m->where('users.id', $user->id));
        }

        $projects = $query->orderBy($sortField, $sortDirection)->paginate(10)->onEachSide(1);

        $assignableUsers = $user->hasRole('admin')
            ? User::query()->where('role', 'manager')->orderBy('name')->get(['id', 'name', 'email', 'role'])
            : [];

        return inertia('Project/Index', [
            'projects' => ProjectResource::collection($projects),
            'assignableUsers' => $assignableUsers,
            'queryParams' => request()->query() ?: null,
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return inertia('Project/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProjectRequest $request)
    {
        $data = $request->validated();
        /** @var $image \Illuminate\Http\UploadedFile */
        $image = $data['image'] ?? null;
        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();
        if ($image) {
            $data['image_path'] = $image->store('project/'.Str::random());
        }
        $project = Project::create($data);
        $project->members()->attach(auth()->id(), [
            'role' => 'manager',
            'added_by' => auth()->id(),
        ]);

        return to_route('project.index')
            ->with('success', 'Project '.'"'.$data['name'].'"'.' was created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        $query = $project->tasks()
            ->visibleTo(auth()->user())
            ->with(['project.members:id,name,email,role,avatar_path', 'project.createdBy', 'assignedUser', 'createdBy', 'updatedBy']);

        $sortField = request('sort_field', 'created_at');
        $sortDirection = request('sort_direction', 'desc');
        if (request('name')) {
            $query->where('name', 'like', '%'.request('name').'%');
        }
        if (request('status')) {
            $query->where('status', request('status'));
        }
        $tasks = $query->orderBy($sortField, $sortDirection)->paginate(10)->onEachSide(1);

        $project->load('members');
        $canManage = auth()->user()->can('manageMembers', $project);
        $mentionable = $project->members->concat([$project->createdBy]);

        return inertia('Project/Show', [
            'project' => new ProjectResource($project),
            'members' => $project->members->map(fn ($u) => $this->memberData($u, $u->pivot?->role))->values(),
            'candidates' => $canManage
                ? User::whereNotIn('id', $project->members->pluck('id'))->orderBy('name')->get(['id', 'name', 'email'])
                : [],
            'mentionable' => $mentionable->unique('id')->map(fn ($u) => $this->memberData($u))->values(),
            'comments' => $this->commentsFor($project),
            'tasks' => TaskResource::collection($tasks),
            'queryParams' => request()->query() ?: null,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Project $project)
    {
        return inertia(
            'Project/Edit',
            ['project' => new ProjectResource($project)]
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProjectRequest $request, Project $project)
    {
        $data = $request->validated();
        $image = $data['image'] ?? null;
        $data['updated_by'] = auth()->id();
        if ($image) {
            if ($project->image_path) {
                Storage::deleteDirectory(dirname($project->image_path));
            }
            $data['image_path'] = $image->store('project/'.Str::random());
        }
        $project->update($data);

        return to_route('project.index')
            ->with('success', 'Project '.'"'.$data['name'].'"'.' was updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        $name = $project->name;
        $project->delete();
        if ($project->image_path) {
            Storage::deleteDirectory(dirname($project->image_path));
        }

        return to_route('project.index')->with('success', 'Project '.'"'.$name.'"'.' was deleted successfully!');
    }

    /**
     * Quick-assign a project to a new owner/manager (Admin only, target must have role 'manager').
     */
    public function quickAssign(Request $request, Project $project)
    {
        $this->authorize('quickAssign', $project);

        $data = $request->validate([
            'assigned_user_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'manager')),
            ],
        ]);

        $newOwner = User::findOrFail($data['assigned_user_id']);

        $project->update([
            'created_by' => $newOwner->id,
            'updated_by' => auth()->id(),
        ]);

        $project->members()->syncWithoutDetaching([
            $newOwner->id => [
                'role' => 'manager',
                'added_by' => auth()->id(),
            ],
        ]);

        return back()->with('success', "Project \"{$project->name}\" was assigned to {$newOwner->name}!");
    }

    protected function memberData(User $u, ?string $role = null): array
    {
        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'avatar_url' => $u->avatar_url, 'role' => $role];
    }

    protected function commentsFor(Project $project)
    {
        return CommentResource::collection(
            $project->comments()->with('user', 'mentions.user')->oldest()->get()
        )->resolve();
    }
}
