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

        $projectContext = null;
        if (! empty($validated['project_id'])) {
            $project = Project::find($validated['project_id']);
            if ($project) {
                $projectContext = "Project Name: {$project->name}. Summary: {$project->description}";
            }
        }

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

        $projectContext = null;
        if (! empty($validated['project_id'])) {
            $project = Project::find($validated['project_id']);
            if ($project) {
                $projectContext = "Project Name: {$project->name}. Summary: {$project->description}";
            }
        }

        $enhanced = $bedrock->enhanceTaskDescription(
            $validated['title'],
            $validated['description'],
            $projectContext
        );

        return response()->json([
            'enhanced_description' => $enhanced,
        ]);
    }
}
