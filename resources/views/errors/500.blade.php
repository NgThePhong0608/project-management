@extends('errors.layout')

@section('title', '500 Server Error - Something Went Wrong')

@section('content')
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900 shadow-sm mb-6">
        <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
        500 Server Error
    </span>

    <div class="p-6 rounded-3xl ring-8 bg-red-100 dark:bg-red-950/50 ring-red-200 dark:ring-red-900/50 text-red-600 dark:text-red-400 mb-6 shadow-xl">
        <svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
    </div>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
        Something Went Wrong
    </h1>

    <p class="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        Our servers encountered an unexpected issue while processing your request. Please try reloading the page or check back shortly.
    </p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onclick="window.location.reload()" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Reload Page</span>
        </button>
        <a href="{{ auth()->check() ? route('dashboard') : '/' }}" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Back to Dashboard</span>
        </a>
    </div>
@endsection

