<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskSubtask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskSubtaskController extends Controller
{
    public function store(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255', 'required_without:titles'],
            'titles' => ['nullable', 'array', 'min:1', 'max:25', 'required_without:title'],
            'titles.*' => ['required', 'string', 'max:255'],
        ]);

        $titles = $validated['titles'] ?? [$validated['title']];
        $nextPosition = ((int) $task->subtasks()->max('position')) + 1;

        foreach ($titles as $title) {
            $trimmed = trim($title);
            if ($trimmed === '') {
                continue;
            }

            $task->subtasks()->create([
                'title' => $trimmed,
                'is_completed' => false,
                'position' => $nextPosition++,
                'created_by' => $request->user()?->id,
            ]);
        }

        return back();
    }

    public function toggle(Task $task, TaskSubtask $subtask): RedirectResponse
    {
        $this->authorize('update', $task);

        abort_if($subtask->task_id !== $task->id, 404);

        $subtask->update([
            'is_completed' => ! $subtask->is_completed,
        ]);

        return back();
    }

    public function destroy(Task $task, TaskSubtask $subtask): RedirectResponse
    {
        $this->authorize('update', $task);

        abort_if($subtask->task_id !== $task->id, 404);

        $subtask->delete();

        return back();
    }
}

