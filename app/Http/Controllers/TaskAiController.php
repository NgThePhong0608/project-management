<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\BedrockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskAiController extends Controller
{
    public function breakdown(Request $request, BedrockService $bedrock): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'nullable|integer',
        ]);

        $projectContext = $this->resolveProjectContext($validated['project_id'] ?? null);

        $subtasks = $bedrock->breakdownTask(
            $validated['title'],
            $validated['description'] ?? null,
            $projectContext
        );

        return response()->json([
            'subtasks' => $subtasks,
        ]);
    }

    public function enhance(Request $request, BedrockService $bedrock): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'project_id' => 'nullable|integer',
        ]);

        $projectContext = $this->resolveProjectContext($validated['project_id'] ?? null);

        $enhanced = $bedrock->enhanceTaskDescription(
            $validated['title'],
            $validated['description'],
            $projectContext
        );

        return response()->json([
            'enhanced_description' => $enhanced,
        ]);
    }

    private function resolveProjectContext(?int $projectId): ?string
    {
        if (! $projectId) {
            return null;
        }

        $project = Project::find($projectId);
        if (! $project) {
            return null;
        }

        $this->authorize('view', $project);

        return "Project Name: {$project->name}. Summary: {$project->description}";
    }
}
