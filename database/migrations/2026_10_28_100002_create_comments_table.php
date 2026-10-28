<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->morphs('commentable');
            $table->foreignId('parent_id')->nullable()->constrained('comments')->onDelete('cascade');
            $table->text('body');
            $table->timestamps();

            $table->index(['commentable_type', 'commentable_id', 'created_at'], 'comments_commentable_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
