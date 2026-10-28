<x-mail::message>
# Hello {{ $user->name ?? 'there' }},

This is a confirmation that the password for your account ({{ $user->email }}) in **{{ config('app.name') }}** was successfully changed at **{{ $changedAt }}**.

<x-mail::button :url="$loginUrl">
Go to Login
</x-mail::button>

If you did not perform this change, please reset your password immediately or contact the system administrator.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
