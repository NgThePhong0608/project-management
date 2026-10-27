<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (
            str_starts_with(config('app.url'), 'https://') ||
            (! str_contains(config('app.url'), 'localhost') && $this->app->environment('production', 'staging', 'dev')) ||
            (! $this->app->runningInConsole() && (
                request()->isSecure() ||
                request()->header('x-forwarded-proto') === 'https' ||
                request()->header('cloudfront-forwarded-proto') === 'https'
            ))
        ) {
            URL::forceScheme('https');
        }
    }
}
