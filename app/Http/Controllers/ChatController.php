<?php

namespace App\Http\Controllers;

use App\Events\ConversationMemberRemoved;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function __construct(protected ChatService $chatService) {}

    /**
     * Display the chat interface with conversation list.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $conversations = Conversation::forUser($user->id)
            ->with('users:id,name,email,avatar_path')
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn (Conversation $conversation) => $this->formatConversationSummary($conversation, $user));

        $colleagues = User::where('id', '!=', $user->id)
            ->select(['id', 'name', 'email', 'avatar_path'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatar_url,
            ]);

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
            'colleagues' => $colleagues,
            'initialConversationId' => $request->integer('conversation') ?: null,
        ]);
    }

    /**
     * Get global unread messages count for the current user across all conversations.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $unreadCount = (int) DB::table('conversation_user')
            ->where('user_id', $user->id)
            ->sum('unread_count');

        return response()->json([
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Create a new group conversation.
     */
    public function createGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $user = $request->user();

        $memberIds = collect($validated['user_ids'])
            ->reject(fn ($id) => (int) $id === $user->id)
            ->unique()
            ->values()
            ->all();

        if (empty($memberIds)) {
            return response()->json([
                'message' => 'Please select at least one colleague to create a group.',
                'errors' => ['user_ids' => ['Please select at least one colleague to create a group.']],
            ], 422);
        }

        $conversation = Conversation::create([
            'type' => Conversation::TYPE_GROUP,
            'name' => $validated['name'],
            'created_by' => $user->id,
            'last_message_at' => now(),
        ]);

        $attachData = [
            $user->id => ['unread_count' => 0, 'last_read_at' => now(), 'role' => 'manager'],
        ];

        foreach ($memberIds as $memberId) {
            $attachData[$memberId] = ['unread_count' => 0, 'last_read_at' => null, 'role' => 'member'];
        }

        $conversation->users()->attach($attachData);

        return response()->json([
            'conversation' => $this->formatConversationSummary($conversation, $user),
        ], 201);
    }

    /**
     * Add a member to an existing group conversation.
     */
    public function addMember(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->isParticipant($user->id), 403, 'Unauthorized conversation access.');
        abort_unless($conversation->isGroup(), 400, 'Cannot add members to a direct conversation.');
        abort_unless($conversation->canManage($user), 403, 'Only group managers or admins can add members.');

        if ($conversation->is_terminated && ! $conversation->canManage($user)) {
            abort(403, 'Cannot add members to a terminated group.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $newUserId = (int) $validated['user_id'];

        if (! $conversation->isParticipant($newUserId)) {
            $conversation->users()->attach($newUserId, [
                'unread_count' => 0,
                'last_read_at' => null,
                'role' => 'member',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Member added successfully.',
            'conversation' => $this->formatConversationSummary($conversation->fresh(), $user),
        ]);
    }

    /**
     * Remove a member from a group conversation or leave group.
     */
    public function removeMember(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($conversation->isParticipant($currentUser->id), 403, 'Unauthorized conversation access.');
        abort_unless($conversation->isGroup(), 400, 'Cannot remove members from a direct conversation.');
        abort_unless($conversation->isParticipant($user->id), 404, 'User is not a member of this conversation.');

        if ($currentUser->id !== $user->id) {
            abort_unless($conversation->canManage($currentUser), 403, 'Only group managers or admins can remove other members.');
            if ((int) $conversation->created_by === (int) $user->id && $currentUser->role !== 'admin') {
                abort(403, 'Cannot remove the group creator.');
            }
        }

        $conversation->users()->detach($user->id);

        broadcast(new ConversationMemberRemoved($conversation->id, $user->id));

        return response()->json([
            'success' => true,
            'message' => 'Member removed successfully.',
            'conversation' => $this->formatConversationSummary($conversation->fresh(), $currentUser),
        ]);
    }

    /**
     * Update a member's role within a group conversation.
     */
    public function updateMemberRole(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($conversation->isParticipant($currentUser->id), 403, 'Unauthorized conversation access.');
        abort_unless($conversation->isGroup(), 400, 'Cannot manage roles on a direct conversation.');
        abort_unless($conversation->canManage($currentUser), 403, 'Only group managers or admins can update member roles.');
        abort_unless($conversation->isParticipant($user->id), 404, 'User is not a member of this conversation.');

        if ((int) $conversation->created_by === (int) $user->id && $currentUser->role !== 'admin') {
            abort(403, 'Cannot modify the group creator role.');
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:member,manager'],
        ]);

        $conversation->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Member role updated successfully.',
            'conversation' => $this->formatConversationSummary($conversation->fresh(), $currentUser),
        ]);
    }

    /**
     * Toggle group conversation termination status (locked/unlocked).
     */
    public function toggleTerminate(Request $request, Conversation $conversation): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($conversation->isParticipant($currentUser->id), 403, 'Unauthorized conversation access.');
        abort_unless($conversation->isGroup(), 400, 'Cannot terminate a direct conversation.');
        abort_unless($conversation->canManage($currentUser), 403, 'Only group managers or admins can terminate or resume a group.');

        $conversation->update([
            'is_terminated' => ! $conversation->is_terminated,
        ]);

        return response()->json([
            'success' => true,
            'is_terminated' => (bool) $conversation->is_terminated,
            'message' => $conversation->is_terminated ? 'Group chat has been terminated.' : 'Group chat has been resumed.',
            'conversation' => $this->formatConversationSummary($conversation->fresh(), $currentUser),
        ]);
    }

    /**
     * Delete an entire group conversation.
     */
    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        $currentUser = $request->user();
        abort_unless($conversation->isParticipant($currentUser->id), 403, 'Unauthorized conversation access.');
        abort_unless($conversation->isGroup(), 400, 'Cannot delete a direct conversation.');

        if ((int) $conversation->created_by !== (int) $currentUser->id && $currentUser->role !== 'admin') {
            abort(403, 'Only the group creator or system admin can delete this group.');
        }

        $conversation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Group conversation deleted successfully.',
        ]);
    }

    /**
     * Get paginated messages for a conversation from DynamoDB.
     */
    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->isParticipant($user->id), 403, 'Unauthorized conversation access.');

        // Viewing messages marks the conversation as read
        $conversation->markAsRead($user->id);

        $cursor = $request->input('cursor');
        if (is_string($cursor)) {
            $cursor = json_decode(base64_decode($cursor), true);
        }

        $result = $this->chatService->getMessages(
            conversationId: $conversation->id,
            limit: 30,
            exclusiveStartKey: is_array($cursor) ? $cursor : null
        );

        $nextCursor = null;
        if (! empty($result['next_cursor'])) {
            $nextCursor = base64_encode(json_encode($result['next_cursor']));
        }

        return response()->json([
            'messages' => $result['messages'],
            'next_cursor' => $nextCursor,
        ]);
    }

    /**
     * Send a message in a conversation.
     */
    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->isParticipant($user->id), 403, 'Unauthorized conversation access.');

        if ($conversation->is_terminated && ! $conversation->canManage($user)) {
            abort(403, 'This group conversation has been terminated. Only managers or admins can post messages.');
        }

        $validated = $request->validate([
            'body' => ['required_without:message', 'nullable', 'string', 'max:2000'],
            'message' => ['required_without:body', 'nullable', 'string', 'max:2000'],
        ]);

        $body = (string) ($validated['body'] ?? $validated['message']);

        // 1. Save to DynamoDB
        $message = $this->chatService->saveMessage($conversation->id, $user, $body);

        // 2. Update MySQL metadata
        $conversation->update(['last_message_at' => now()]);
        $conversation->markAsRead($user->id);

        // Increment unread_count for other participants
        DB::table('conversation_user')
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $user->id)
            ->increment('unread_count');

        // 3. Broadcast to recipient channels and conversation channel
        $recipientIds = $conversation->users()
            ->where('users.id', '!=', $user->id)
            ->pluck('users.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $formattedConversation = $this->formatConversationSummary($conversation, $user);

        broadcast(new MessageSent($message, $formattedConversation, $recipientIds))->toOthers();

        return response()->json($message, 201);
    }

    /**
     * Start or find a direct 1-1 conversation with a user.
     */
    public function startDirect(Request $request, User $user): RedirectResponse|JsonResponse
    {
        $currentUser = $request->user();
        abort_if($user->id === $currentUser->id, 400, 'Cannot start conversation with yourself.');

        $conversation = Conversation::findOrCreateDirect($currentUser->id, $user->id);

        if ($request->wantsJson()) {
            return response()->json([
                'conversation_id' => $conversation->id,
            ]);
        }

        return redirect()->route('chat.index', ['conversation' => $conversation->id]);
    }

    /**
     * Mark conversation as read for current user.
     */
    public function markAsRead(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->isParticipant($user->id), 403, 'Unauthorized conversation access.');

        $conversation->markAsRead($user->id);

        return response()->json(['success' => true]);
    }

    /**
     * Format a conversation summary for client responses.
     *
     * @return array<string, mixed>
     */
    protected function formatConversationSummary(Conversation $conversation, User $user): array
    {
        if (! $conversation->relationLoaded('users')) {
            $conversation->load('users:id,name,email,avatar_path');
        }

        $partner = $conversation->getPartner($user->id);
        $pivot = $conversation->users->firstWhere('id', $user->id)?->pivot;

        $lastReadAt = $pivot?->last_read_at ? Carbon::parse($pivot->last_read_at) : null;
        $lastMessageAt = $conversation->last_message_at ? Carbon::parse($conversation->last_message_at) : null;
        $unreadCount = (int) ($pivot?->unread_count ?? 0);
        $canManage = $conversation->canManage($user);

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'name' => $conversation->name,
            'created_by' => $conversation->created_by,
            'is_terminated' => (bool) $conversation->is_terminated,
            'can_manage' => $canManage,
            'is_creator' => (int) $conversation->created_by === (int) $user->id,
            'last_message_at' => $lastMessageAt?->toISOString(),
            'last_read_at' => $lastReadAt?->toISOString(),
            'unread_count' => $unreadCount,
            'is_unread' => $unreadCount > 0 || (bool) ($lastMessageAt && (! $lastReadAt || $lastMessageAt->gt($lastReadAt))),
            'partner' => $partner ? [
                'id' => $partner->id,
                'name' => $partner->name,
                'email' => $partner->email,
                'avatar_url' => $partner->avatar_url,
            ] : null,
            'users' => $conversation->users->map(function (User $u) use ($conversation) {
                $role = ((int) $conversation->created_by === (int) $u->id)
                    ? 'creator'
                    : ($u->pivot?->role ?? 'member');

                $joinedAt = $u->pivot?->created_at ? Carbon::parse($u->pivot->created_at)->toISOString() : null;

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar_url' => $u->avatar_url,
                    'role' => $role,
                    'joined_at' => $joinedAt,
                ];
            })->values()->all(),
        ];
    }
}
