@extends('errors.layout')

@section('title', '404 Not Found - Page Not Found')

@section('content')
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shadow-sm mb-6">
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
        404 Not Found
    </span>

    <div class="p-6 rounded-3xl ring-8 bg-indigo-100 dark:bg-indigo-950/50 ring-indigo-200 dark:ring-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-6 shadow-xl">
        <svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    </div>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
        Page Not Found
    </h1>

    <p class="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        {{ $exception->getMessage() ?: "Sorry, we couldn’t find the page or resource you’re looking for. It might have been moved, renamed, or deleted." }}
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

