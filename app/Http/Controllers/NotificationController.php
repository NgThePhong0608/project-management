<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Get recent notifications and unread count for the authenticated user, or render the notifications page.
     */
    public function index(Request $request): JsonResponse|Response
    {
        $this->authorize('viewAny', DatabaseNotification::class);

        $user = $request->user();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $notifications = $user->notifications()
                ->latest()
                ->take(15)
                ->get()
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'data' => $notification->data,
                        'read_at' => $notification->read_at,
                        'created_at' => $notification->created_at->diffForHumans(),
                    ];
                });

            return response()->json([
                'notifications' => $notifications,
                'unreadCount' => $user->unreadNotifications()->count(),
            ]);
        }

        $filter = $request->query('filter', 'all');
        $query = $user->notifications()->latest();

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->paginate(20)
            ->withQueryString()
            ->through(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'data' => $notification->data,
                    'read_at' => $notification->read_at?->format('Y-m-d H:i:s'),
                    'created_at' => $notification->created_at->format('Y-m-d H:i:s'),
                    'created_at_human' => $notification->created_at->diffForHumans(),
                ];
            });

        return Inertia::render('Notification/Index', [
            'notifications' => $notifications,
            'unreadCount' => $user->unreadNotifications()->count(),
            'filter' => $filter,
            'success' => session('success'),
        ]);
    }

    /**
     * Get the unread notification count for the authenticated user.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unreadCount' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Display the specified notification detail page.
     */
    public function show(Request $request, string $id): Response|RedirectResponse
    {
        $this->authorize('viewAny', DatabaseNotification::class);

        $notification = $request->user()->notifications()->findOrFail($id);
        $this->authorize('view', $notification);

        if (is_null($notification->read_at)) {
            $notification->markAsRead();
        }

        $user = $request->user();
        $wantsDetail = $request->query('view') === 'detail' || $request->boolean('detail', false);

        if (! $wantsDetail) {
            if (! empty($notification->data['target_url'])) {
                if ($this->canAccessTarget($user, $notification)) {
                    return redirect($notification->data['target_url']);
                }
            } elseif (! empty($notification->data['task_id'])) {
                $task = Task::find($notification->data['task_id']);
                if ($task && $user->can('view', $task)) {
                    return redirect()->route('task.show', $notification->data['task_id']);
                }
            }
        }

        $targetUrl = $notification->data['target_url'] ?? null;
        if (! $targetUrl && ! empty($notification->data['task_id'])) {
            $targetUrl = route('task.show', $notification->data['task_id'], false);
        }

        $canAccess = $this->canAccessTarget($user, $notification);

        return Inertia::render('Notification/Show', [
            'notification' => [
                'id' => $notification->id,
                'type' => $notification->type,
                'data' => $notification->data,
                'read_at' => $notification->read_at?->format('Y-m-d H:i:s'),
                'created_at' => $notification->created_at->format('Y-m-d H:i:s'),
                'created_at_human' => $notification->created_at->diffForHumans(),
            ],
            'targetUrl' => $canAccess ? $targetUrl : null,
            'isTargetAccessible' => $canAccess,
        ]);
    }

    protected function canAccessTarget(User $user, DatabaseNotification $notification): bool
    {
        $data = $notification->data ?? [];

        if (! empty($data['task_id'])) {
            $task = Task::find($data['task_id']);

            return (bool) ($task && $user->can('view', $task));
        }

        if (! empty($data['target_url'])) {
            $url = (string) $data['target_url'];
            if (preg_match('#/task/(\d+)#', $url, $matches)) {
                $task = Task::find($matches[1]);

                return (bool) ($task && $user->can('view', $task));
            }
            if (preg_match('#/project/(\d+)#', $url, $matches)) {
                $project = Project::find($matches[1]);

                return (bool) ($project && $user->can('view', $project));
            }
        }

        return false;
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse|RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }
}
