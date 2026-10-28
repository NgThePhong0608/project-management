<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\LoginHistory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $loginHistories = $user->loginHistories()
            ->take(15)
            ->get()
            ->map(fn (LoginHistory $item) => [
                'id' => $item->id,
                'event' => $item->event,
                'ip_address' => $item->ip_address,
                'user_agent' => $item->user_agent,
                'occurred_at' => $item->occurred_at?->format('Y-m-d H:i:s'),
                'occurred_at_human' => $item->occurred_at?->diffForHumans(),
            ]);

        $memberLoginHistories = [];
        if ($user->hasRole('admin')) {
            $memberLoginHistories = LoginHistory::query()
                ->with('user:id,name,email,role,avatar_path')
                ->whereHas('user', fn ($q) => $q->where('role', '!=', 'admin'))
                ->latest('occurred_at')
                ->take(30)
                ->get()
                ->map(fn (LoginHistory $item) => [
                    'id' => $item->id,
                    'event' => $item->event,
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                    'occurred_at' => $item->occurred_at?->format('Y-m-d H:i:s'),
                    'occurred_at_human' => $item->occurred_at?->diffForHumans(),
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
                        'email' => $item->user->email,
                        'role' => $item->user->role,
                        'avatar_url' => $item->user->avatar_url,
                    ] : null,
                ]);
        }

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'loginHistories' => $loginHistories,
            'memberLoginHistories' => $memberLoginHistories,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::deleteDirectory(dirname($user->avatar_path));
            }
            $user->avatar_path = $request->file('avatar')->store('avatar/'.Str::random());
        } elseif ($request->boolean('remove_avatar') && $user->avatar_path) {
            Storage::deleteDirectory(dirname($user->avatar_path));
            $user->avatar_path = null;
        }

        if ($request->hasFile('cover')) {
            if ($user->cover_path) {
                Storage::deleteDirectory(dirname($user->cover_path));
            }
            $user->cover_path = $request->file('cover')->store('cover/'.Str::random());
        } elseif ($request->boolean('remove_cover') && $user->cover_path) {
            Storage::deleteDirectory(dirname($user->cover_path));
            $user->cover_path = null;
        }

        $user->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        if ($user->avatar_path) {
            Storage::deleteDirectory(dirname($user->avatar_path));
        }

        if ($user->cover_path) {
            Storage::deleteDirectory(dirname($user->cover_path));
        }

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
