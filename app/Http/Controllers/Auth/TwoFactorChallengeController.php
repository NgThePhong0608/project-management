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

        $userId = $request->session()->get('login.two_factor_user_id');
        $user = User::findOrFail($userId);

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
            $field = $request->filled('recovery_code') ? 'recovery_code' : 'code';

            throw ValidationException::withMessages([
                $field => 'The provided two-factor authentication code is invalid.',
            ]);
        }

        $request->session()->forget(['login.two_factor_user_id', 'login.remember']);

        Auth::login($user, $remember);

        $request->session()->regenerate();
        $request->session()->put('last_activity_time', time());

        LoginHistory::record($user, 'login', $request);

        return redirect()->intended(RouteServiceProvider::HOME);
    }
}
