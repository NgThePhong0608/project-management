<?php

namespace App\Rules;

use App\Services\TurnstileService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class TurnstileRule implements ValidationRule
{
    /**
     * Indicates whether the rule should be implicit (run even when empty).
     *
     * @var bool
     */
    public $implicit = true;

    /**
     * Run the validation rule.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! config('services.turnstile.enabled', true)) {
            return;
        }

        $service = app(TurnstileService::class);
        $isValid = $service->verify(is_string($value) ? $value : null, request()->ip());

        if (! $isValid) {
            $fail('Bot verification failed. Please complete the Cloudflare security check and try again.');
        }
    }
}
