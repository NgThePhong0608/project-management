<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskAttachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskAttachmentController extends Controller
{
    public function store(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip',
            ],
        ]);

        $file = $validated['file'];
        $disk = config('filesystems.default');
        $originalName = $file->getClientOriginalName();
        $base = pathinfo($originalName, PATHINFO_FILENAME);
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $safeName = (Str::slug($base) ?: 'attachment').'.'.$ext;
        $path = $file->storeAs("task-attachments/{$task->id}/".Str::random(8), $safeName, $disk);

        $task->attachments()->create([
            'user_id' => $request->user()?->id,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $originalName,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize() ?? 0,
        ]);

        TaskActivity::create([
            'task_id' => $task->id,
            'user_id' => $request->user()?->id,
            'action' => 'attachment_added',
            'changes' => [
                'attachment' => ['old' => null, 'new' => $originalName],
            ],
            'created_at' => now(),
        ]);

        return back();
    }

    public function download(Task $task, TaskAttachment $attachment): StreamedResponse
    {
        $this->authorize('view', $task);

        abort_if($attachment->task_id !== $task->id, 404);
        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404);

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_name);
    }

    public function destroy(Request $request, Task $task, TaskAttachment $attachment): RedirectResponse
    {
        $this->authorize('update', $task);

        abort_if($attachment->task_id !== $task->id, 404);

        $originalName = $attachment->original_name;
        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();

        TaskActivity::create([
            'task_id' => $task->id,
            'user_id' => $request->user()?->id,
            'action' => 'attachment_removed',
            'changes' => [
                'attachment' => ['old' => $originalName, 'new' => null],
            ],
            'created_at' => now(),
        ]);

        return back();
    }
}
