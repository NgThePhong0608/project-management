<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\TaskResource;
use App\Http\Resources\UserResource;
use App\Models\Task;
use App\Models\User;

class UserController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(User::class, 'user');
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = User::query();

        $sortField = request('sort_field', 'created_at');
        $sortDirection = request('sort_direction', 'desc');

        if (request('name')) {
            $query->where('name', 'like', '%'.request('name').'%');
        }
        if (request('email')) {
            $query->where('email', 'like', '%'.request('email').'%');
        }

        $users = $query->orderBy($sortField, $sortDirection)
            ->paginate(10)
            ->onEachSide(1);

        return inertia('User/Index', [
            'users' => UserResource::collection($users),
            'queryParams' => request()->query() ?: null,
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return inertia('User/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();
        $data['email_verified_at'] = time();
        $data['password'] = bcrypt($data['password']);
        User::create($data);

        return to_route('user.index')
            ->with('success', 'User '.'"'.$data['name'].'"'.'was created');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        $viewer = auth()->user();
        $isPrivileged = $viewer && ($viewer->hasRole('admin') || $viewer->id === $user->id);

        $loginHistories = $isPrivileged
            ? $user->loginHistories()
                ->take(20)
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'event' => $item->event,
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                    'occurred_at' => $item->occurred_at?->format('Y-m-d H:i:s'),
                    'occurred_at_human' => $item->occurred_at?->diffForHumans(),
                ])
            : [];

        $taskQuery = Task::query()
            ->where('assigned_user_id', $user->id)
            ->visibleTo($viewer);

        $sortField = request('sort_field', 'created_at');
        $sortDirection = request('sort_direction', 'desc');
        if (request('name')) {
            $taskQuery->where('name', 'like', '%'.request('name').'%');
        }
        if (request('status')) {
            $taskQuery->where('status', request('status'));
        }
        $tasks = $taskQuery->orderBy($sortField, $sortDirection)->paginate(10)->onEachSide(1);

        return inertia('User/Show', [
            'user' => new UserResource($user),
            'tasks' => TaskResource::collection($tasks),
            'queryParams' => request()->query() ?: null,
            'loginHistories' => $loginHistories,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        return inertia('User/Edit', [
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();
        if (! empty($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);

        return to_route('user.index')
            ->with('success', 'User '.'"'.$data['name'].'"'.' was updated');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return to_route('user.index')
            ->with('success', 'User '.'"'.$user->name.'"'.' was deleted');
    }
}
