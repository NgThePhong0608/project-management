<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\UnreadChatReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendUnreadChatRemindersCommand extends Command
{
    protected $signature = 'chat:send-unread-reminders';

    protected $description = 'Send reminder notifications to users who have unread chat messages';

    public function handle(): int
    {
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $groupConcat = $isSqlite
            ? "GROUP_CONCAT(COALESCE(conversations.name, 'Direct Chat'), '||')"
            : "GROUP_CONCAT(COALESCE(conversations.name, 'Direct Chat') SEPARATOR '||')";

        $unreadStats = DB::table('conversation_user')
            ->join('conversations', 'conversation_user.conversation_id', '=', 'conversations.id')
            ->where('conversation_user.unread_count', '>', 0)
            ->select(
                'conversation_user.user_id',
                DB::raw('SUM(conversation_user.unread_count) as total_unread'),
                DB::raw('COUNT(conversation_user.conversation_id) as conversation_count'),
                DB::raw("{$groupConcat} as conv_names")
            )
            ->groupBy('conversation_user.user_id')
            ->get();

        $count = 0;
        foreach ($unreadStats as $stat) {
            $user = User::find($stat->user_id);
            if (! $user) {
                continue;
            }

            $rawNames = array_filter(explode('||', (string) $stat->conv_names));
            $sampleNames = array_values(array_slice(array_unique($rawNames), 0, 3));

            $user->notify(new UnreadChatReminderNotification(
                (int) $stat->total_unread,
                (int) $stat->conversation_count,
                $sampleNames
            ));
            $count++;
        }

        $this->info("Sent unread chat reminders to {$count} user(s).");

        return self::SUCCESS;
    }
}
