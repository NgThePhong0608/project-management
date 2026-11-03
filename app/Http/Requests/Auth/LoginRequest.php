<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Rules\TurnstileRule;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, Rule|array|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'cf_turnstile_response' => [new TurnstileRule],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): ?User
    {
        $this->ensureIsNotRateLimited();

        $user = User::where('email', $this->string('email'))->first();

        if ($user) {
            // If lock expired (1 day elapsed), clear the lock and reset the counter
            if ($user->locked_until && $user->locked_until->isPast()) {
                $user->unlock();
            }

            if ($user->isLocked()) {
                throw ValidationException::withMessages([
                    'email' => 'Your account has been locked due to exceeding 5 logins without setting up Two-Factor Authentication. Please contact an administrator to unlock your account.',
                ]);
            }
        }

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        $authenticatedUser = Auth::user();

        // Case 1: User has 2FA enabled -> Withhold full login and redirect to 2FA challenge
        if ($authenticatedUser->hasMfa()) {
            Auth::logout();
            $this->session()->put('login.two_factor_user_id', $authenticatedUser->id);
            $this->session()->put('login.two_factor_challenge_expires_at', now()->addMinutes(10)->timestamp);
            $this->session()->put('login.remember', $this->boolean('remember'));

            return null;
        }

        // Case 2: User DOES NOT have 2FA enabled -> increment counter
        $authenticatedUser->increment('mfa_unconfigured_login_count');

        if ($authenticatedUser->mfa_unconfigured_login_count >= 5) {
            $authenticatedUser->update([
                'locked_until' => now()->addDay(),
                'lock_reason' => 'Exceeded 5 logins without setting up Two-Factor Authentication.',
            ]);

            Auth::logout();

            throw ValidationException::withMessages([
                'email' => 'Your account has been locked due to exceeding 5 logins without setting up Two-Factor Authentication. Please contact an administrator to unlock your account.',
            ]);
        }

        return $authenticatedUser;
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
