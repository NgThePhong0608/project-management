<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\IdentifySubdomainSession;
use App\Models\LoginHistory;
use App\Models\OAuthAccount;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use App\Services\SubdomainSessionManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
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
    public function redirect(string $provider, Request $request): RedirectResponse
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

        $redirectResponse = $driver->redirect();

        $slug = $request->attributes->get('subdomain_slug');
        if ($slug && $slug !== 'primary') {
            $targetUrl = $redirectResponse->getTargetUrl();
            parse_str(parse_url($targetUrl, PHP_URL_QUERY) ?? '', $query);
            $state = $query['state'] ?? null;
            if ($state) {
                // Cryptographically bind this handoff to the initiating browser
                $browserBinding = hash_hmac('sha256', $state, (string) config('app.key'));
                $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

                Cache::put("oauth_handoff:{$state}", [
                    'slug' => $slug,
                    'browser_binding' => $browserBinding,
                    'device_id' => $deviceId,
                ], 600); // 10 minutes

                // Set parent domain cookie so the initiating browser sends it to the primary callback host
                $appHost = (string) (parse_url((string) config('app.url'), PHP_URL_HOST) ?? 'localhost');
                $cookieDomain = (new IdentifySubdomainSession(app(SubdomainSessionManager::class)))->getBaseDomainForCookie($appHost);

                $redirectResponse->headers->setCookie(cookie(
                    'oauth_browser_state',
                    $browserBinding,
                    10,
                    '/',
                    $cookieDomain,
                    $request->isSecure(),
                    true,
                    false,
                    'Lax'
                ));
            }
        }

        return $redirectResponse;
    }

    /**
     * Handle the OAuth provider callback.
     */
    public function callback(string $provider, Request $request): RedirectResponse
    {
        if (! array_key_exists($provider, $this->providers)) {
            abort(404);
        }

        $state = (string) $request->query('state');
        $handoff = $state ? Cache::pull("oauth_handoff:{$state}") : null;

        // Verify that the browser completing the callback is the same browser that initiated the handoff
        if ($handoff) {
            $cookieBinding = (string) $request->cookie('oauth_browser_state');
            if (empty($cookieBinding) || ! hash_equals($handoff['browser_binding'], $cookieBinding)) {
                Log::warning("OAuth browser mismatch for state [{$state}]: potential CSRF or account takeover blocked.");

                return redirect()->away($this->buildSafeRootUrl('/login'))->with([
                    'status' => 'Authentication session mismatch. Please try signing in again.',
                    'status_type' => 'error',
                ]);
            }
        }

        try {
            $driver = $this->getDriver($provider);
            $socialUser = $handoff ? $driver->stateless()->user() : $driver->user();
        } catch (Throwable $e) {
            Log::warning("OAuth login failed for provider [{$provider}]: ".$e->getMessage());

            return redirect()->away($this->buildSafeRootUrl('/login'))->with([
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
            return redirect()->away($this->buildSafeRootUrl('/login'))->withErrors([
                'email' => $user->lock_reason ?? 'Your account is locked.',
            ]);
        }

        // If initiating request came from a subdomain session host, hand off authentication
        if ($handoff) {
            $handoffToken = Str::random(40);
            Cache::put("oauth_auth_handoff:{$handoffToken}", [
                'user_id' => $user->id,
                'has_mfa' => (bool) $user->has_mfa,
                'slug' => $handoff['slug'],
                'device_id' => $handoff['device_id'],
            ], 120);

            $handoffUrl = $this->buildSafeSubdomainUrl($handoff['slug'], '/auth/oauth-handoff?token='.$handoffToken);

            return redirect()->away($handoffUrl);
        }

        // Security check: Two-Factor Authentication
        if ($user->has_mfa) {
            $request->session()->put('login.two_factor_user_id', $user->id);

            return redirect()->route('two-factor.challenge');
        }

        Auth::login($user, remember: true);

        $request->session()->regenerate();
        $request->session()->put('last_activity_time', time());
        $request->session()->put('subdomain_session_time', microtime(true));

        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));
        $slug = (string) ($request->attributes->get('subdomain_slug') ?? 'primary');
        if ($deviceId) {
            app(SubdomainSessionManager::class)->clearSessionTermination($deviceId, $slug);
        }

        LoginHistory::record($user, 'social_login', $request);

        return redirect()->intended(RouteServiceProvider::HOME);
    }

    /**
     * Authenticate on the initiating subdomain host via single-use handoff token.
     */
    public function handoff(Request $request): RedirectResponse
    {
        $token = $request->query('token');
        if (! $token || ! is_string($token)) {
            return redirect()->away($this->buildSafeRootUrl('/login'))->with([
                'status' => 'Invalid or expired authentication handoff.',
                'status_type' => 'error',
            ]);
        }

        $payload = Cache::pull("oauth_auth_handoff:{$token}");
        if (! $payload || ! isset($payload['user_id'])) {
            return redirect()->away($this->buildSafeRootUrl('/login'))->with([
                'status' => 'Authentication handoff has expired. Please try signing in again.',
                'status_type' => 'error',
            ]);
        }

        $currentSlug = $request->attributes->get('subdomain_slug');
        if ($currentSlug !== ($payload['slug'] ?? '')) {
            return redirect()->away($this->buildSafeRootUrl('/login'))->with([
                'status' => 'Session mismatch during handoff.',
                'status_type' => 'error',
            ]);
        }

        $user = User::findOrFail($payload['user_id']);

        if (! empty($payload['has_mfa']) && $user->has_mfa) {
            $request->session()->put('login.two_factor_user_id', $user->id);

            return redirect()->route('two-factor.challenge');
        }

        Auth::login($user, remember: true);

        $request->session()->regenerate();
        $request->session()->put('last_activity_time', time());
        $request->session()->put('subdomain_session_time', microtime(true));

        $deviceId = (string) ($request->attributes->get('device_id') ?? $payload['device_id'] ?? '');
        if ($deviceId) {
            app(SubdomainSessionManager::class)->clearSessionTermination($deviceId, $currentSlug);
        }

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

    /**
     * Build safe subdomain URL from server-side config('app.url') and validated slug, never from request headers.
     */
    protected function buildSafeSubdomainUrl(string $slug, string $path = '/'): string
    {
        if (! preg_match('/^[a-z0-9]+-[a-z0-9]+$/i', $slug)) {
            abort(400, 'Invalid subdomain slug.');
        }

        $appUrl = (string) config('app.url', 'http://localhost');
        $parsed = parse_url($appUrl);
        $scheme = $parsed['scheme'] ?? 'http';
        $baseHost = $parsed['host'] ?? 'localhost';
        $port = isset($parsed['port']) ? ":{$parsed['port']}" : '';

        return "{$scheme}://{$slug}.{$baseHost}{$port}{$path}";
    }

    /**
     * Build safe root URL from server-side config('app.url'), never from request headers.
     */
    protected function buildSafeRootUrl(string $path = '/login'): string
    {
        $appUrl = (string) config('app.url', 'http://localhost');
        $parsed = parse_url($appUrl);
        $scheme = $parsed['scheme'] ?? 'http';
        $baseHost = $parsed['host'] ?? 'localhost';
        $port = isset($parsed['port']) ? ":{$parsed['port']}" : '';

        return "{$scheme}://{$baseHost}{$port}{$path}";
    }
}
