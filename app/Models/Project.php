<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'due_date',
        'status',
        'image_path',
        'created_by',
        'updated_by',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
