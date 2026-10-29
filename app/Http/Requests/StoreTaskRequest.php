<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'max:255'],
            'image' => ['nullable', 'image'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'project_id' => [
                'required',
                'exists:projects,id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $project = Project::find($value);
                    if (! $project || ! $this->user()->can('view', $project)) {
                        $fail('The selected project is invalid.');
                    }
                },
            ],
            'assigned_user_id' => ['required', 'exists:users,id'],
            'status' => [
                'required',
                Rule::in(
                    $this->user()?->hasRole('admin', 'manager')
                        ? ['pending', 'in_progress', 'completed', 'closed']
                        : ['pending', 'in_progress', 'completed']
                ),
            ],
            'priority' => [
                'required',
                Rule::in(['low', 'medium', 'high']),
            ],
        ];
    }
}
