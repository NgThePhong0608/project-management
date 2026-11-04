<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\LoginHistory;
use App\Models\OAuthAccount;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class SocialiteController extends Controller
{
    /**
     * Supported OAuth providers and their Socialite driver mappings.
     *
     * @var array<string, string>
     */
    protected array $providers = [
        'x' => 'twitter-oauth-2',
        'github' => 'github',
        'gitlab' => 'gitlab',
    ];

    /**
     * Resolve the configured Socialite driver instance.
     */
    protected function getDriver(string $provider)
    {
        $driver = $this->providers[$provider];
        $instance = Socialite::driver($driver);

        if ($provider === 'gitlab' && method_exists($instance, 'setHost') && config('services.gitlab.host')) {
            $instance->setHost(config('services.gitlab.host'));
        }

        return $instance;
    }

    /**
     * Redirect to the OAuth provider.
     */
    public function redirect(string $provider): RedirectResponse
    {
        if (! array_key_exists($provider, $this->providers)) {
            abort(404);
        }

        $driver = $this->getDriver($provider);

        // Force account selection/consent so users can switch accounts if multiple exist
        $promptParams = match ($provider) {
            'github' => ['prompt' => 'consent'],
            'gitlab' => ['prompt' => 'select_account'],
            default => [],
        };

        if (! empty($promptParams) && method_exists($driver, 'with')) {
            $driver->with($promptParams);
        }

        return $driver->redirect();
    }

    /**
     * Handle the OAuth provider callback.
     */
    public function callback(string $provider, Request $request): RedirectResponse
    {
        if (! array_key_exists($provider, $this->providers)) {
            abort(404);
        }

        try {
            $socialUser = $this->getDriver($provider)->user();
        } catch (Throwable $e) {
            Log::warning("OAuth login failed for provider [{$provider}]: ".$e->getMessage());

            return redirect()->route('login')->with([
                'status' => 'Authentication via '.strtoupper($provider).' was cancelled or encountered an error.',
                'status_type' => 'error',
            ]);
        }

        $providerId = (string) $socialUser->getId();
        $nickname = $socialUser->getNickname() ?? $socialUser->getName();
        $avatar = $socialUser->getAvatar();
        $token = $socialUser->token ?? null;
        $refreshToken = $socialUser->refreshToken ?? null;

        // Fallback for providers where email might not be shared (e.g. X/Twitter)
        $email = $socialUser->getEmail();
        if (empty($email)) {
            $email = "x_{$providerId}_".($socialUser->getNickname() ?? 'user').'@users.noreply.x.com';
        }

        // Case A: User is already logged in and linking an account from Profile Settings
        if (Auth::check()) {
            $currentUser = Auth::user();

            $existingLink = OAuthAccount::where('provider', $provider)
                ->where('provider_id', $providerId)
                ->first();

            if ($existingLink && $existingLink->user_id !== $currentUser->id) {
                return redirect()->route('profile.edit')->withErrors([
                    'oauth' => "This {$provider} account is already linked to another user.",
                ]);
            }

            OAuthAccount::updateOrCreate(
                ['user_id' => $currentUser->id, 'provider' => $provider],
                [
                    'provider_id' => $providerId,
                    'nickname' => $nickname,
                    'provider_token' => $token,
                    'provider_refresh_token' => $refreshToken,
                    'avatar_url' => $avatar,
                ]
            );

            return redirect()->route('profile.edit')->with(
                'status',
                ucfirst($provider).' account successfully connected.'
            );
        }

        // Case B: Guest Login or Registration
        $oauthAccount = OAuthAccount::where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();

        if ($oauthAccount) {
            $user = $oauthAccount->user;
            $oauthAccount->update([
                'nickname' => $nickname,
                'provider_token' => $token,
                'provider_refresh_token' => $refreshToken,
                'avatar_url' => $avatar,
            ]);
        } else {
            // Check if existing user with matching verified email exists
            $user = User::where('email', $email)->first();

            if (! $user) {
                $user = User::create([
                    'name' => $socialUser->getName() ?? $nickname ?? 'User',
                    'email' => $email,
                    'password' => null,
                    'role' => 'member',
                    'email_verified_at' => now(),
                ]);
            }

            OAuthAccount::create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => $providerId,
                'nickname' => $nickname,
                'provider_token' => $token,
                'provider_refresh_token' => $refreshToken,
                'avatar_url' => $avatar,
            ]);
        }

        // Security check: Lockout status
        if ($user->is_locked) {
            return redirect()->route('login')->withErrors([
                'email' => $user->lock_reason ?? 'Your account is locked.',
            ]);
        }

        // Security check: Two-Factor Authentication
        if ($user->has_mfa) {
            $request->session()->put('login.two_factor_user_id', $user->id);

            return redirect()->route('two-factor.challenge');
        }

        Auth::login($user, remember: true);

        $request->session()->regenerate();
        $request->session()->put('last_activity_time', time());

        LoginHistory::record($user, 'social_login', $request);

        return redirect()->intended(RouteServiceProvider::HOME);
    }

    /**
     * Unlink a connected OAuth account.
     */
    public function unlink(string $provider, Request $request): RedirectResponse
    {
        $user = $request->user();
        $hasPassword = ! empty($user->password);
        $connectedCount = $user->oauthAccounts()->count();

        // Prevent lockout: User must retain at least one login method
        if (! $hasPassword && $connectedCount <= 1) {
            return back()->withErrors([
                'oauth' => 'You cannot disconnect your only login method. Please set a password first.',
            ]);
        }

        $user->oauthAccounts()->where('provider', $provider)->delete();

        return back()->with('status', strtoupper($provider).' account disconnected.');
    }
}
