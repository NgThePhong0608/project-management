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
     * Build full URL on the target session subdomain using config('app.url') to prevent host header injection.
     */
    protected function buildSubdomainUrl(Request $request, string $slug, string $path = '/'): string
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
}
