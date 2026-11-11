@extends('errors.layout')

@section('title', '401 Unauthorized - Authentication Required')

@section('content')
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shadow-sm mb-6">
        <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        401 Unauthorized
    </span>

    <div class="p-6 rounded-3xl ring-8 bg-amber-100 dark:bg-amber-950/50 ring-amber-200 dark:ring-amber-900/50 text-amber-600 dark:text-amber-400 mb-6 shadow-xl">
        <svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
    </div>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
        Authentication Required
    </h1>

    <p class="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        {{ $exception->getMessage() ?: "Your session has expired or you need to sign in to access this area." }}
    </p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="{{ route('login') }}" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            <span>Sign In to Continue</span>
        </a>
    </div>
@endsection
