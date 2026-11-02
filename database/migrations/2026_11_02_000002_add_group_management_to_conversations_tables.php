<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            if (! Schema::hasColumn('conversations', 'is_terminated')) {
                $table->boolean('is_terminated')->default(false)->after('last_message_at');
            }
        });

        Schema::table('conversation_user', function (Blueprint $table) {
            if (! Schema::hasColumn('conversation_user', 'role')) {
                $table->string('role', 20)->default('member')->after('unread_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            if (Schema::hasColumn('conversation_user', 'role')) {
                $table->dropColumn('role');
            }
        });

        Schema::table('conversations', function (Blueprint $table) {
            if (Schema::hasColumn('conversations', 'is_terminated')) {
                $table->dropColumn('is_terminated');
            }
        });
    }
};

