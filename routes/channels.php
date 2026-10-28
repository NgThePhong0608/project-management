<?php

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('project.{id}', function ($user, $id) {
    $project = Project::find($id);

    return $project && $user->can('view', $project);
});

Broadcast::channel('task.{id}', function ($user, $id) {
    $task = Task::find($id);

    return $task && $user->can('view', $task);
});
