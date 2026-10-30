<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            ->map(function ($conversation) use ($user) {
                $partner = $conversation->getPartner($user->id);
                $pivot = $conversation->users->firstWhere('id', $user->id)?->pivot;

                $lastReadAt = $pivot?->last_read_at ? Carbon::parse($pivot->last_read_at) : null;
                $lastMessageAt = $conversation->last_message_at ? Carbon::parse($conversation->last_message_at) : null;

                return [
                    'id' => $conversation->id,
                    'type' => $conversation->type,
                    'name' => $conversation->name,
                    'last_message_at' => $lastMessageAt?->toISOString(),
                    'last_read_at' => $lastReadAt?->toISOString(),
                    'is_unread' => (bool) ($lastMessageAt && (! $lastReadAt || $lastMessageAt->gt($lastReadAt))),
                    'partner' => $partner ? [
                        'id' => $partner->id,
                        'name' => $partner->name,
                        'email' => $partner->email,
                        'avatar_url' => $partner->avatar_url,
                    ] : null,
                ];
            });

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
     * Get paginated messages for a conversation from DynamoDB.
     */
    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($conversation->isParticipant($request->user()->id), 403, 'Unauthorized conversation access.');

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

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        // 1. Save to DynamoDB
        $message = $this->chatService->saveMessage($conversation->id, $user, $validated['body']);

        // 2. Update MySQL metadata
        $conversation->update(['last_message_at' => now()]);
        $conversation->markAsRead($user->id);

        // 3. Broadcast to others via Reverb
        broadcast(new MessageSent($message))->toOthers();

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
}
