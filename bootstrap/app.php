<?php

use App\Http\Middleware\CheckSessionIdleTimeout;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IdentifySubdomainSession;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['pm_device_id', 'oauth_browser_state']);
        $middleware->web(append: [
            IdentifySubdomainSession::class,
            CheckSessionIdleTimeout::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (SymfonyResponse $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if ($status === 419) {
                if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                    return $response;
                }

                return back()->with([
                    'status' => 'Your session has expired. Please try again.',
                ]);
            }

            if (in_array($status, [401, 403, 404, 500, 503], true)) {
                if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                    return $response;
                }

                if (config('app.debug') && $status >= 500 && ! $request->header('X-Inertia')) {
                    return $response;
                }

                return Inertia::render('Error', [
                    'status' => $status,
                    'message' => $exception->getMessage() ?: null,
                ])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
