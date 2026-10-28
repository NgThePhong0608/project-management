<x-mail::message>
# Hello {{ $user->name ?? 'there' }},

You are receiving this email because we received a password reset request for your account in **{{ config('app.name') }}**.

<x-mail::button :url="$resetUrl">
Reset Password
</x-mail::button>

This password reset link will expire in **{{ $expireMinutes }} minutes**.

If you did not request a password reset, no further action is required and your password will remain unchanged.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
