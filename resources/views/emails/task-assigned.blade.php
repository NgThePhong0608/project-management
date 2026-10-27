<x-mail::message>
# Hello {{ $user->name }},

You have been assigned to a new task by **{{ $assignedBy }}** in {{ config('app.name') }}.

### Task Details
- **Task Name:** {{ $task->name }}
- **Project:** {{ $projectName }}
- **Priority:** {{ strtoupper($task->priority) }}
- **Due Date:** {{ $dueDate }}

@if (!empty($task->description))
**Description:**  
{{ $task->description }}
@endif

<x-mail::button :url="$taskUrl">
View Task Details
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
