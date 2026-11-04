<?php

namespace App\Http\Middleware;

use App\Services\SubdomainSessionManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class IdentifySubdomainSession
{
    public const DEVICE_COOKIE = 'pm_device_id';

    public function __construct(protected SubdomainSessionManager $manager) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $deviceId = $request->query('device_id')
            ?? $request->cookie(self::DEVICE_COOKIE)
            ?? $request->session()->get('subdomain_device_id');
        $isNewDevice = false;

        if (! $deviceId) {
            $deviceId = 'dev_'.Str::random(24);
            $isNewDevice = true;
        } elseif ($request->query('device_id') && $request->cookie(self::DEVICE_COOKIE) !== $deviceId) {
            $isNewDevice = true;
        }

        $request->session()->put('subdomain_device_id', $deviceId);

        $slug = $this->extractSlug($request->getHost()) ?? 'primary';

        $request->attributes->set('subdomain_slug', $slug);
        $request->attributes->set('device_id', $deviceId);

        // If request is on a session subdomain but multi-session is disabled, revoke & redirect to root
        if ($slug !== 'primary' && ! $this->manager->isMultiSessionEnabled($deviceId)) {
            if (Auth::check()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json(['message' => 'Multi-session is disabled on this device.', 'status' => 'multi_session_disabled'], 401);
            }

            $rootLoginUrl = $this->buildRootUrl($request, '/login');

            return redirect()->away($rootLoginUrl)->with('status', 'Multi-session has been disabled. Please log in on the main domain.');
        }

        // If authenticated, check if this session was revoked or terminated
        if (Auth::check()) {
            $loginTime = $request->session()->get('subdomain_session_time');
            if ($loginTime === null) {
                $loginTime = time();
                $request->session()->put('subdomain_session_time', $loginTime);
            }

            if ($this->manager->isSessionRevoked($deviceId, $slug, $loginTime)) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                    return response()->json(['message' => 'This session has been signed out.', 'status' => 'session_terminated'], 401);
                }

                return redirect()->route('login')->with('status', 'This session has been signed out.');
            }

            $this->manager->registerSession($deviceId, $slug, Auth::user(), $request->getHttpHost());
            $request->session()->put('subdomain_registered', true);
        }

        $response = $next($request);

        if ($isNewDevice) {
            $cookieDomain = $this->getBaseDomainForCookie($request->getHost());
            $cookie = Cookie::make(
                self::DEVICE_COOKIE,
                $deviceId,
                60 * 24 * 365, // 1 year
                '/',
                $cookieDomain,
                false, // secure
                false, // httpOnly
                false, // raw
                'Lax'  // sameSite
            );
            $response->headers->setCookie($cookie);
        }

        return $response;
    }

    /**
     * Extract session subdomain slug from host, e.g. 1001-a1.localhost -> 1001-a1
     */
    public function extractSlug(string $host): ?string
    {
        // Strip port if present
        $host = explode(':', $host)[0];

        // Match wildcard subdomain pattern like 1001-a1.app.test or 1001-a1.localhost or sess-abc123.localhost
        if (preg_match('/^([a-z0-9]+-[a-z0-9]+)\.(.+)$/i', $host, $matches)) {
            return strtolower($matches[1]);
        }

        return null;
    }

    /**
     * Build root URL without subdomain slug.
     */
    public function buildRootUrl(Request $request, string $path = '/'): string
    {
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $host = explode(':', $request->getHost())[0];

        if (preg_match('/^[a-z0-9]+-[a-z0-9]+\.(.+)$/i', $host, $matches)) {
            $baseHost = $matches[1];
        } else {
            $baseHost = $host;
        }

        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';

        return "{$scheme}://{$baseHost}{$portSuffix}{$path}";
    }

    /**
     * Determine parent base domain for the device ID cookie so all subdomains share it.
     */
    public function getBaseDomainForCookie(string $host): ?string
    {
        $host = explode(':', $host)[0];

        if ($host === 'localhost' || str_ends_with($host, '.localhost')) {
            return '.localhost';
        }

        $parts = explode('.', $host);
        if (count($parts) >= 3) {
            // e.g. 1001-a1.app.example.com -> .app.example.com
            array_shift($parts);

            return '.'.implode('.', $parts);
        }

        return null;
    }
}
