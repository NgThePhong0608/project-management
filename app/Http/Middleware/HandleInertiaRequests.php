<?php

namespace App\Http\Middleware;

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
    public function version(Request $request): string|null
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
                'can' => $user ? [
                    'createProject' => $user->can('create', \App\Models\Project::class),
                    'createTask'    => $user->can('create', \App\Models\Task::class),
                    'manageUsers'   => $user->can('viewAny', \App\Models\User::class),
                ] : [],
            ],
        ];
    }
}
