<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            if (! Schema::hasColumn('conversations', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('type')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('conversation_user', function (Blueprint $table) {
            if (! Schema::hasColumn('conversation_user', 'unread_count')) {
                $table->unsignedInteger('unread_count')->default(0)->after('last_read_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            if (Schema::hasColumn('conversation_user', 'unread_count')) {
                $table->dropColumn('unread_count');
            }
        });

        Schema::table('conversations', function (Blueprint $table) {
            if (Schema::hasColumn('conversations', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });
    }
};
