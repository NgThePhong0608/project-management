<?php

namespace App\Http\Controllers;

use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileTwoFactorController extends Controller
{
    public function __construct(protected TwoFactorService $twoFactorService) {}

    /**
     * Start two-factor authentication setup by generating secret and QR code URL.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        // If user already has a pending secret, reuse or create fresh
        $secret = $this->twoFactorService->generateSecretKey();
        $user->update(['two_factor_secret' => $secret]);

        $qrCodeUrl = $this->twoFactorService->getQrCodeUrl(
            config('app.name', 'Laravel'),
            $user->email,
            $secret
        );

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
        ]);
    }

    /**
     * Confirm two-factor authentication setup with the 6-digit code.
     */
    public function confirm(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        if (! $user->two_factor_secret || ! $this->twoFactorService->verifyKey($user->two_factor_secret, $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => 'The provided two-factor authentication code is invalid.',
            ]);
        }

        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes();

        $user->update([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
            'mfa_unconfigured_login_count' => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication has been enabled successfully.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * View two-factor recovery codes.
     */
    public function recoveryCodes(Request $request): JsonResponse
    {
        $this->validatePassword($request);

        $user = $request->user();
        $codes = json_decode((string) $user->two_factor_recovery_codes, true) ?: [];

        return response()->json([
            'recovery_codes' => $codes,
        ]);
    }

    /**
     * Regenerate new two-factor recovery codes.
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $this->validatePassword($request);

        $user = $request->user();
        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes();

        $user->update([
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
        ]);

        return response()->json([
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Disable two-factor authentication for the user.
     */
    public function disable(Request $request): JsonResponse
    {
        $this->validatePassword($request);

        $user = $request->user();
        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Two-factor authentication has been disabled.',
        ]);
    }

    /**
     * Helper to validate the user's current password.
     */
    protected function validatePassword(Request $request): void
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'password' => 'The provided password does not match your current password.',
            ]);
        }
    }
}
