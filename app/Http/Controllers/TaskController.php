<?php

namespace App\Http\Controllers;

use App\Events\TaskActivityRecorded;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\CommentResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use App\Services\AwsNotificationService;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    public function __construct(
        protected AwsNotificationService $awsNotificationService
    ) {
        $this->authorizeResource(Task::class, 'task');
    }

    protected function clearDashboardCache(?int $userId = null): void
    {
        Cache::forget('dashboard_global_task_counts');
        if ($userId) {
            Cache::forget("dashboard_user_stats_{$userId}");
        }
    }

    protected function publishTaskNotification(Task $task, ?User $assignedUser, string $action = 'assigned'): void
    {
        if (! $assignedUser) {
            return;
        }

        $assignedUser->notify(new TaskAssignedNotification($task, $action, $this->awsNotificationService));

        $dueDate = $task->due_date instanceof DateTimeInterface
            ? $task->due_date->format('Y-m-d')
            : ($task->due_date ?? null);

        // Publish event to AWS SNS Topic & log to CloudWatch Logs
        $this->awsNotificationService->publish("Task {$action}: {$task->name}", [
            'event' => 'TASK_'.strtoupper($action),
            'task_id' => $task->id,
            'task_name' => $task->name,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name ?? 'General',
            'assigned_user_id' => $assignedUser->id,
            'assigned_user_name' => $assignedUser->name,
            'assigned_user_email' => $assignedUser->email,
            'due_date' => $dueDate,
            'action' => $action,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Task::query()
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
        $tasks = $query->orderBy($sortField, $sortDirection)->paginate(30)->onEachSide(1);

        return inertia('Task/Index', [
            'tasks' => TaskResource::collection($tasks),
            'queryParams' => request()->query() ?: null,
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $projects = Project::query()->visibleTo(auth()->user())->orderBy('name', 'asc')->get();
        $users = User::query()->orderBy('name', 'asc')->get();

        return inertia('Task/Create', [
            'projects' => ProjectResource::collection($projects),
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskRequest $request)
    {
        $data = $request->validated();
        /** @var $image \Illuminate\Http\UploadedFile */
        $image = $data['image'] ?? null;
        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();
        if ($image) {
            $origName = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME);
            $ext = strtolower($image->getClientOriginalExtension() ?: $image->extension() ?: 'png');
            $safeName = (Str::slug($origName) ?: 'task-image').'.'.$ext;
            $data['image_path'] = $image->storeAs('task/'.Str::random(), $safeName);
        }
        $task = Task::create($data);
        $this->clearDashboardCache($task->assigned_user_id);

        if ($task->assigned_user_id) {
            $assignedUser = User::find($task->assigned_user_id);
            $this->publishTaskNotification($task, $assignedUser, 'assigned');
        }

        return to_route('project.index')
            ->with('success', 'Task '.'"'.$data['name'].'"'.' was created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Task $task)
    {
        $task->load('project.members', 'project.createdBy', 'assignedUser', 'createdBy');
        $mentionable = $task->project->members
            ->concat([$task->project->createdBy, $task->assignedUser, $task->createdBy])
            ->filter()->unique('id')
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'avatar_url' => $u->avatar_url])
            ->values();

        return inertia('Task/Show', [
            'task' => new TaskResource($task),
            'mentionable' => $mentionable,
            'comments' => CommentResource::collection(
                $task->comments()->with('user', 'mentions.user')->oldest()->get()
            )->resolve(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Task $task)
    {
        $projects = Project::query()->visibleTo(auth()->user())->orderBy('name', 'asc')->get();
        $users = User::query()->orderBy('name', 'asc')->get();

        return inertia('Task/Edit', [
            'task' => new TaskResource($task),
            'projects' => ProjectResource::collection($projects),
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateTaskRequest $request, Task $task)
    {
        $data = $request->validated();
        $image = $data['image'] ?? null;
        $data['updated_by'] = auth()->id();
        if ($image) {
            // Keep historical task images in Storage so Before -> After activity comments can still display them
            $origName = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME);
            $ext = strtolower($image->getClientOriginalExtension() ?: $image->extension() ?: 'png');
            $safeName = (Str::slug($origName) ?: 'task-image').'.'.$ext;
            $data['image_path'] = $image->storeAs('task/'.Str::random(), $safeName);
        }
        $oldAssignedUserId = $task->assigned_user_id;
        $trackedFields = ['name', 'description', 'status', 'priority', 'due_date', 'project_id', 'assigned_user_id', 'image_path'];
        $before = $task->only($trackedFields);

        $task->update($data);

        $changes = [];
        foreach ($trackedFields as $field) {
            $oldVal = $before[$field] ?? null;
            $newVal = $task->{$field} ?? null;
            if ((string) $oldVal !== (string) $newVal) {
                $changes[$field] = ['old' => $oldVal, 'new' => $newVal];
            }
        }

        if (! empty($changes)) {
            TaskActivityRecorded::dispatch($task->fresh(['assignedUser', 'project']), $request->user(), $changes);
        }

        $this->clearDashboardCache($task->assigned_user_id);
        if ($oldAssignedUserId && $oldAssignedUserId != $task->assigned_user_id) {
            $this->clearDashboardCache($oldAssignedUserId);
        }

        if ($task->assigned_user_id && $task->assigned_user_id != $oldAssignedUserId) {
            $assignedUser = User::find($task->assigned_user_id);
            $this->publishTaskNotification($task, $assignedUser, 'reassigned');
        }

        return to_route('task.index')
            ->with('success', "Task \"$task->name\" was updated");
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Task $task)
    {
        $name = $task->name;
        $assignedUserId = $task->assigned_user_id;
        $task->delete();
        $this->clearDashboardCache($assignedUserId);
        if ($task->image_path) {
            Storage::deleteDirectory(dirname($task->image_path));
        }

        return to_route('task.index')
            ->with('success', "Task \"$name\" was deleted");
    }

    /**
     * Quick-assign a task to a user belonging to the project (Admin and Manager only).
     */
    public function quickAssign(Request $request, Task $task)
    {
        $this->authorize('quickAssign', $task);

        $task->loadMissing('project.members');

        $data = $request->validate([
            'assigned_user_id' => [
                'required',
                'exists:users,id',
                function (string $attribute, mixed $value, \Closure $fail) use ($task) {
                    $targetUser = User::find($value);
                    if (! $targetUser || $targetUser->hasRole('admin')) {
                        $fail('The selected user cannot be quick-assigned to this task.');

                        return;
                    }

                    $inProject = $task->project
                        && ($task->project->created_by === $targetUser->id || $task->project->isMember($targetUser));

                    if (! $inProject) {
                        $fail('The selected user has not joined this project.');
                    }
                },
            ],
        ]);

        $oldAssignedUserId = $task->assigned_user_id;
        $newAssignee = User::findOrFail($data['assigned_user_id']);

        $task->update([
            'assigned_user_id' => $newAssignee->id,
            'updated_by' => auth()->id(),
        ]);

        if ((int) $oldAssignedUserId !== (int) $newAssignee->id) {
            TaskActivityRecorded::dispatch(
                $task->fresh(['assignedUser', 'project']),
                $request->user(),
                ['assigned_user_id' => ['old' => $oldAssignedUserId, 'new' => $newAssignee->id]]
            );
        }

        $this->clearDashboardCache($newAssignee->id);
        if ($oldAssignedUserId && $oldAssignedUserId != $newAssignee->id) {
            $this->clearDashboardCache($oldAssignedUserId);
        }

        if ($oldAssignedUserId != $newAssignee->id) {
            $this->publishTaskNotification($task, $newAssignee, 'reassigned');
        }

        return back()->with('success', "Task \"{$task->name}\" was assigned to {$newAssignee->name}!");
    }
}
