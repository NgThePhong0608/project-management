<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'unreadNotificationsCount' => $user ? $user->unreadNotifications()->count() : 0,
                'sessionIdleTimeout' => (int) config('session.idle_timeout', 15),
                'can' => $user ? [
                    'createProject' => $user->can('create', Project::class),
                    'createTask' => $user->can('create', Task::class),
                    'manageUsers' => $user->can('viewAny', User::class),
                ] : [],
            ],
            'turnstile' => [
                'enabled' => (bool) config('services.turnstile.enabled', true),
                'siteKey' => config('services.turnstile.site_key'),
            ],
        ];
    }
}
