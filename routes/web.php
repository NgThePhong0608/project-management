<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfileTwoFactorController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::redirect('/', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    Route::resource('project', ProjectController::class);
    Route::patch('/project/{project}/quick-assign', [ProjectController::class, 'quickAssign'])
        ->name('project.quickAssign');
    Route::post('/project/{project}/members', [ProjectMemberController::class, 'store'])
        ->name('project.members.store');
    Route::delete('/project/{project}/members/{user}', [ProjectMemberController::class, 'destroy'])
        ->name('project.members.destroy');
    Route::resource('task', TaskController::class);
    Route::patch('/task/{task}/quick-assign', [TaskController::class, 'quickAssign'])
        ->name('task.quickAssign');
    Route::post('/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::post('/comments/upload-image', [CommentController::class, 'uploadImage'])->name('comments.uploadImage');
    Route::get('/comments/attachment-url', [CommentController::class, 'attachmentUrl'])->name('comments.attachmentUrl');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
    Route::patch('/user/{user}/role', [UserController::class, 'updateRole'])->name('user.updateRole');
    Route::post('/user/{user}/unlock', [UserController::class, 'unlock'])->name('user.unlock');
    Route::resource('user', UserController::class);

    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::get('/unread-count', [NotificationController::class, 'unreadCount'])
            ->name('notifications.unreadCount');
        Route::post('read-all', [NotificationController::class, 'markAllAsRead'])
            ->name('notifications.readAll');
        Route::get('{id}', [NotificationController::class, 'show'])
            ->name('notifications.show');
        Route::post('{id}/read', [NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
    });

    Route::prefix('chat')->name('chat.')->group(function () {
        Route::get('/', [ChatController::class, 'index'])->name('index');
        Route::get('/unread-count', [ChatController::class, 'unreadCount'])->name('unreadCount');
        Route::post('/group', [ChatController::class, 'createGroup'])->name('createGroup');
        Route::post('/{conversation}/members', [ChatController::class, 'addMember'])->name('addMember');
        Route::delete('/{conversation}/members/{user}', [ChatController::class, 'removeMember'])->name('removeMember');
        Route::patch('/{conversation}/members/{user}/role', [ChatController::class, 'updateMemberRole'])->name('updateMemberRole');
        Route::post('/{conversation}/terminate', [ChatController::class, 'toggleTerminate'])->name('toggleTerminate');
        Route::delete('/{conversation}', [ChatController::class, 'destroy'])->name('destroy');
        Route::post('/start/{user}', [ChatController::class, 'startDirect'])->name('startDirect');
        Route::get('/{conversation}/messages', [ChatController::class, 'messages'])->name('messages');
        Route::post('/{conversation}/messages', [ChatController::class, 'sendMessage'])->name('sendMessage');
        Route::post('/{conversation}/read', [ChatController::class, 'markAsRead'])->name('markAsRead');
    });
});

Route::middleware('auth')->group(function () {
    Route::post('/session/keep-alive', fn () => response()->noContent())->name('session.keepAlive');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::match(['patch', 'post'], '/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::prefix('profile/two-factor')->name('profile.two-factor.')->group(function () {
        Route::post('enable', [ProfileTwoFactorController::class, 'enable'])->name('enable');
        Route::post('confirm', [ProfileTwoFactorController::class, 'confirm'])->name('confirm');
        Route::post('recovery-codes', [ProfileTwoFactorController::class, 'recoveryCodes'])->name('recovery-codes');
        Route::post('regenerate-recovery-codes', [ProfileTwoFactorController::class, 'regenerateRecoveryCodes'])->name('regenerate-recovery-codes');
        Route::delete('disable', [ProfileTwoFactorController::class, 'disable'])->name('disable');
    });
});

require __DIR__.'/auth.php';
