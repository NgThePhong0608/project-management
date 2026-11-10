<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\SubdomainSessionManager;
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
        $manager = app(SubdomainSessionManager::class);
        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

        // Never expose device session registry or counts to unauthenticated guests
        $rawSessions = ($user && $deviceId) ? array_values($manager->getActiveSessions($deviceId)) : [];
        $totalSessionsCount = count($rawSessions);

        // Only admins can see and switch to other active sessions. Non-admins only see their current session.
        $isAdmin = (bool) ($user && $user->role === 'admin');
        $activeSessions = $isAdmin
            ? $rawSessions
            : ($user ? array_values(array_filter($rawSessions, fn ($s) => ($s['slug'] ?? '') === $request->attributes->get('subdomain_slug'))) : []);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'deviceId' => $deviceId,
                'subdomainSlug' => $request->attributes->get('subdomain_slug'),
                'multiSessionEnabled' => $deviceId ? $manager->isMultiSessionEnabled($deviceId) : false,
                'canSwitchSubdomainSessions' => $isAdmin,
                'activeSubdomainSessions' => $activeSessions,
                'activeSubdomainSessionsCount' => $totalSessionsCount,
                'maxSubdomainSessions' => SubdomainSessionManager::MAX_SESSIONS,
                'unreadNotificationsCount' => $user ? $user->unreadNotifications()->count() : 0,
                'sessionIdleTimeout' => (int) config('session.idle_timeout', 15),
                'can' => $user ? [
                    'createProject' => $user->can('create', Project::class),
                    'createTask' => $user->can('create', Task::class),
                    'manageUsers' => $user->can('viewAny', User::class),
                ] : [],
                'permissions' => $user ? $user->getAllPermissions()->pluck('name')->values()->all() : [],
                'roles' => $user ? $user->getRoleNames()->values()->all() : [],
            ],
            'turnstile' => [
                'enabled' => (bool) config('services.turnstile.enabled', true),
                'siteKey' => config('services.turnstile.site_key'),
            ],
        ];
    }
}
