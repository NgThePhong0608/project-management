<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title') - {{ config('app.name', 'Project Management') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700,800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Figtree', 'sans-serif'],
                    },
                },
            },
        }
    </script>
</head>
<body class="font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col justify-between">
    <!-- Topbar -->
    <header class="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <a href="/" class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div class="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                PM
            </div>
            <span>{{ config('app.name', 'Project Management') }}</span>
        </a>
        <a href="/login" class="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Sign In
        </a>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center px-4 py-16">
        <div class="max-w-lg w-full text-center flex flex-col items-center">
            @yield('content')
        </div>
    </main>

    <!-- Footer -->
    <footer class="py-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200/60 dark:border-gray-800">
        &copy; {{ date('Y') }} {{ config('app.name', 'Project Management') }}. All rights reserved.
    </footer>
</body>
</html>
