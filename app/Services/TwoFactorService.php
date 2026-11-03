<?php

namespace App\Services;

use Illuminate\Support\Str;

class TwoFactorService
{
    protected const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a random 32-character Base32 secret key.
     */
    public function generateSecretKey(int $length = 32): string
    {
        $secret = '';
        $charsLen = strlen(self::BASE32_CHARS);

        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, $charsLen - 1)];
        }

        return $secret;
    }

    /**
     * Generate a standard otpauth URL for QR code generation.
     */
    public function getQrCodeUrl(string $appName, string $email, string $secret): string
    {
        $encodedApp = rawurlencode($appName);
        $encodedEmail = rawurlencode($email);

        return "otpauth://totp/{$encodedApp}:{$encodedEmail}?secret={$secret}&issuer={$encodedApp}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Verify a 6-digit TOTP code against the Base32 secret key (RFC 6238).
     */
    public function verifyKey(string $secret, string $code, int $window = 1): bool
    {
        $code = trim($code);
        if (strlen($code) !== 6 || ! ctype_digit($code)) {
            return false;
        }

        $secretBinary = $this->base32Decode($secret);
        if ($secretBinary === false) {
            return false;
        }

        $currentTime = time();

        for ($offset = -$window; $offset <= $window; $offset++) {
            $timeSlice = (int) floor(($currentTime + ($offset * 30)) / 30);
            $calculatedCode = $this->calculateCode($secretBinary, $timeSlice);

            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the current 6-digit TOTP code for a secret key.
     */
    public function getCurrentCode(string $secret, ?int $timestamp = null): ?string
    {
        $secretBinary = $this->base32Decode($secret);
        if ($secretBinary === false) {
            return null;
        }

        $timeSlice = (int) floor(($timestamp ?? time()) / 30);

        return $this->calculateCode($secretBinary, $timeSlice);
    }

    /**
     * Calculate 6-digit TOTP for a given 30-second time slice.
     */
    protected function calculateCode(string $secretBinary, int $timeSlice): string
    {
        // Pack timeSlice as 64-bit big-endian integer
        $timePacked = pack('N*', 0).pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $timePacked, $secretBinary, true);

        // Dynamic truncation (RFC 4226)
        $offset = ord(substr($hash, -1)) & 0x0F;
        $truncatedHash = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $truncatedHash, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate 8 secure random recovery codes.
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = Str::random(10).'-'.Str::random(10);
        }

        return $codes;
    }

    /**
     * Decode a Base32 encoded string to binary.
     */
    protected function base32Decode(string $b32): string|false
    {
        $b32 = strtoupper(trim($b32));
        $b32 = preg_replace('/[^A-Z2-7]/', '', $b32);
        if (empty($b32)) {
            return false;
        }

        $buffer = 0;
        $bufferSize = 0;
        $binary = '';

        $chars = array_flip(str_split(self::BASE32_CHARS));

        for ($i = 0; $i < strlen($b32); $i++) {
            $char = $b32[$i];
            if (! isset($chars[$char])) {
                return false;
            }

            $buffer = ($buffer << 5) | $chars[$char];
            $bufferSize += 5;

            if ($bufferSize >= 8) {
                $bufferSize -= 8;
                $binary .= chr(($buffer >> $bufferSize) & 0xFF);
            }
        }

        return $binary;
    }
}
