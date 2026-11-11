@extends('errors.layout')

@section('title', '403 Forbidden - Access Denied')

@section('content')
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shadow-sm mb-6">
        <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        403 Forbidden
    </span>

    <div class="p-6 rounded-3xl ring-8 bg-rose-100 dark:bg-rose-950/50 ring-rose-200 dark:ring-rose-900/50 text-rose-600 dark:text-rose-400 mb-6 shadow-xl">
        <svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002A11.959 11.959 0 0112 2.964zM12 15.75h.007v.008H12v-.008z" />
        </svg>
    </div>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
        Access Denied
    </h1>

    <p class="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        {{ $exception->getMessage() ?: "You do not have permission to view this resource or perform this action. If you believe this is an error, please contact your project manager or administrator." }}
    </p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onclick="window.history.back()" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Go Back</span>
        </button>
        <a href="{{ auth()->check() ? route('dashboard') : '/' }}" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Back to Dashboard</span>
        </a>
    </div>
@endsection
