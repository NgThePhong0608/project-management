<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\IdentifySubdomainSession;
use App\Services\SubdomainSessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class SubdomainMultiSessionController extends Controller
{
    public function __construct(protected SubdomainSessionManager $manager) {}

    /**
     * Allocate a new subdomain and return the target login URL.
     */
    public function create(Request $request): JsonResponse
    {
        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

        if (! $this->manager->isMultiSessionEnabled($deviceId)) {
            return response()->json([
                'message' => 'Multi-session is currently disabled. Please enable it first.',
            ], 403);
        }

        if ($this->manager->isAtSessionLimit($deviceId)) {
            return response()->json([
                'message' => 'Maximum of 5 active sessions reached. Please close a session first.',
            ], 422);
        }

        // Generate temporary slug for new account authentication
        $slug = 'sess-'.Str::lower(Str::random(6));

        $transferToken = $this->manager->createTransferToken($deviceId);
        $targetUrl = $this->buildSubdomainUrl($request, $slug, '/login?session_transfer='.$transferToken);

        return response()->json([
            'slug' => $slug,
            'url' => $targetUrl,
        ]);
    }

    /**
     * Enable multi-session feature on this device.
     */
    public function enable(Request $request): JsonResponse|RedirectResponse
    {
        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

        $this->manager->enableMultiSession($deviceId);

        if ($request->wantsJson()) {
            return response()->json(['status' => 'enabled', 'multiSessionEnabled' => true]);
        }

        return back();
    }

    /**
     * Disable multi-session feature on this device and revoke all active sessions.
     */
    public function disable(Request $request): JsonResponse|RedirectResponse
    {
        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

        $this->manager->disableMultiSession($deviceId);

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $rootLoginUrl = (new IdentifySubdomainSession($this->manager))->buildRootUrl($request, '/login');

        if ($request->wantsJson()) {
            return response()->json(['status' => 'disabled', 'redirect_url' => $rootLoginUrl]);
        }

        return redirect()->away($rootLoginUrl)->with('status', 'Multi-session disabled. All sessions have been logged out.');
    }

    /**
     * Terminate an active subdomain session.
     */
    public function terminate(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'slug' => ['required', 'string'],
        ]);

        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));
        $slug = $request->input('slug');
        $currentSlug = $request->attributes->get('subdomain_slug');

        if ($currentSlug !== $slug && $request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Only administrators can terminate other sessions.'], 403);
        }

        $this->manager->terminateSession($deviceId, $slug);

        $currentSlug = $request->attributes->get('subdomain_slug');
        if ($currentSlug === $slug) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->wantsJson()) {
            return response()->json(['status' => 'terminated', 'slug' => $slug]);
        }

        return redirect()->route('login');
    }

    /**
     * Terminate all active sessions on this device.
     */
    public function terminateAll(Request $request): JsonResponse|RedirectResponse
    {
        $deviceId = (string) ($request->attributes->get('device_id') ?? $request->cookie(IdentifySubdomainSession::DEVICE_COOKIE, ''));

        $this->manager->terminateAllSessions($deviceId);

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson()) {
            return response()->json(['status' => 'all_terminated']);
        }

        return redirect()->route('login');
    }

    /**
     * Build full URL on the target session subdomain.
     */
    protected function buildSubdomainUrl(Request $request, string $slug, string $path = '/'): string
    {
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $host = explode(':', $request->getHost())[0];

        // Strip current subdomain if already on one
        if (preg_match('/^[a-z0-9]+-[a-z0-9]+\.(.+)$/i', $host, $matches)) {
            $baseHost = $matches[1];
        } else {
            $baseHost = $host;
        }

        $targetHost = "{$slug}.{$baseHost}";
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';

        return "{$scheme}://{$targetHost}{$portSuffix}{$path}";
    }
}
