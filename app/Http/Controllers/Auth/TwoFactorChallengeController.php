<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\LoginHistory;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function __construct(protected TwoFactorService $twoFactorService) {}

    /**
     * Show the two factor challenge view.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('login.two_factor_user_id')) {
            return redirect()->route('login');
        }

        $expiresAt = $request->session()->get('login.two_factor_challenge_expires_at');
        if ($expiresAt && time() > $expiresAt) {
            $request->session()->forget([
                'login.two_factor_user_id',
                'login.two_factor_challenge_expires_at',
                'login.remember',
            ]);

            return redirect()->route('login')->with('status', 'Your two-factor authentication challenge has expired. Please log in again.');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Authenticate the two factor challenge.
     */
    public function store(Request $request): RedirectResponse
    {
        if (! $request->session()->has('login.two_factor_user_id')) {
            return redirect()->route('login');
        }

        $expiresAt = $request->session()->get('login.two_factor_challenge_expires_at');
        if ($expiresAt && time() > $expiresAt) {
            $request->session()->forget([
                'login.two_factor_user_id',
                'login.two_factor_challenge_expires_at',
                'login.remember',
            ]);

            throw ValidationException::withMessages([
                'code' => 'The two-factor authentication challenge has expired. Please log in again.',
            ]);
        }

        $userId = $request->session()->get('login.two_factor_user_id');
        $user = User::findOrFail($userId);

        $throttleKey = 'two-factor:'.$userId;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $request->session()->forget([
                'login.two_factor_user_id',
                'login.two_factor_challenge_expires_at',
                'login.remember',
            ]);

            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'code' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => ceil($seconds / 60),
                ]),
            ]);
        }

        $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $remember = (bool) $request->session()->get('login.remember', false);
        $authenticated = false;

        if ($request->filled('recovery_code')) {
            $recoveryCode = trim((string) $request->input('recovery_code'));
            $recoveryCodes = json_decode((string) $user->two_factor_recovery_codes, true) ?: [];

            if (in_array($recoveryCode, $recoveryCodes, true)) {
                $recoveryCodes = array_values(array_diff($recoveryCodes, [$recoveryCode]));
                $user->update([
                    'two_factor_recovery_codes' => json_encode($recoveryCodes),
                ]);
                $authenticated = true;
            }
        } elseif ($request->filled('code')) {
            $code = trim((string) $request->input('code'));
            if ($user->two_factor_secret && $this->twoFactorService->verifyKey($user->two_factor_secret, $code)) {
                $authenticated = true;
            }
        }

        if (! $authenticated) {
            RateLimiter::hit($throttleKey, 300);

            $attemptsLeft = RateLimiter::remaining($throttleKey, 5);

            if ($attemptsLeft <= 0) {
                // Drop and expire pending challenge immediately upon reaching attempt limit
                $request->session()->forget([
                    'login.two_factor_user_id',
                    'login.two_factor_challenge_expires_at',
                    'login.remember',
                ]);

                throw ValidationException::withMessages([
                    'code' => 'Too many invalid authentication attempts. Your two-factor challenge has expired. Please log in again.',
                ]);
            }

            $field = $request->filled('recovery_code') ? 'recovery_code' : 'code';

            throw ValidationException::withMessages([
                $field => 'The provided two-factor authentication code is invalid.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $request->session()->forget([
            'login.two_factor_user_id',
            'login.two_factor_challenge_expires_at',
            'login.remember',
        ]);

        Auth::login($user, $remember);

        $request->session()->regenerate();
        $request->session()->put('last_activity_time', time());

        LoginHistory::record($user, 'login', $request);

        return redirect()->intended(RouteServiceProvider::HOME);
    }
}
