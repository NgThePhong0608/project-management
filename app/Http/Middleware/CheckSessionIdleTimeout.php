<?php

namespace App\Http\Middleware;

use App\Models\LoginHistory;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckSessionIdleTimeout
{
    /**
     * Handle an incoming request and enforce session inactivity timeout.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $idleTimeoutMinutes = (int) config('session.idle_timeout', 15);

            if ($idleTimeoutMinutes > 0) {
                $now = time();
                $lastActivity = $request->session()->get('last_activity_time');

                if ($lastActivity !== null && ($now - (int) $lastActivity) > ($idleTimeoutMinutes * 60)) {
                    if ($user = $request->user()) {
                        LoginHistory::record($user, 'idle_logout', $request);
                    }

                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    $message = 'Your session has expired due to inactivity. Please log in again.';

                    if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                        return response()->json(['message' => $message], 401);
                    }

                    return redirect()->route('login')->with('status', $message);
                }

                $request->session()->put('last_activity_time', $now);
            }
        }

        return $next($request);
    }
}
