<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Cache global task counts in Redis (shared across all users, TTL 60s)
        $globalCounts = Cache::remember('dashboard_global_task_counts', 60, function () {
            return [
                'totalPendingTasks' => Task::query()->where('status', 'pending')->count(),
                'totalProgressTasks' => Task::query()->where('status', 'in_progress')->count(),
                'totalCompletedTasks' => Task::query()->where('status', 'completed')->count(),
            ];
        });

        // Cache user-specific task stats in Redis (TTL 60s)
        $userCounts = Cache::remember("dashboard_user_stats_{$user->id}", 60, function () use ($user) {
            return [
                'myPendingTasks' => Task::query()->visibleTo($user)
                    ->where('status', 'pending')
                    ->where('assigned_user_id', $user->id)
                    ->count(),
                'myProgressTasks' => Task::query()->visibleTo($user)
                    ->where('status', 'in_progress')
                    ->where('assigned_user_id', $user->id)
                    ->count(),
                'myCompletedTasks' => Task::query()->visibleTo($user)
                    ->where('status', 'completed')
                    ->where('assigned_user_id', $user->id)
                    ->count(),
            ];
        });

        $activeTasks = Task::query()->visibleTo($user)
            ->whereIn('status', ['pending', 'in_progress'])
            ->where('assigned_user_id', $user->id)
            ->limit(10)
            ->get();
        $activeTasks = TaskResource::collection($activeTasks);

        $projectsOverview = Project::query()
            ->visibleTo($user)
            ->with(['createdBy', 'updatedBy', 'members:id,name,email,avatar_path'])
            ->withCount(['members', 'tasks'])
            ->latest('updated_at')
            ->limit(10)
            ->get();

        return inertia('Dashboard', [
            'totalPendingTasks' => $globalCounts['totalPendingTasks'],
            'myPendingTasks' => $userCounts['myPendingTasks'],
            'totalProgressTasks' => $globalCounts['totalProgressTasks'],
            'myProgressTasks' => $userCounts['myProgressTasks'],
            'totalCompletedTasks' => $globalCounts['totalCompletedTasks'],
            'myCompletedTasks' => $userCounts['myCompletedTasks'],
            'activeTasks' => $activeTasks,
            'projectsOverview' => ProjectResource::collection($projectsOverview),
        ]);
    }
}
