import { useEffect, useRef, useState, useCallback } from "react";

export function useChatChannel({
    conversationId,
    currentUserId,
    onNewMessage,
}) {
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const typingTimerRef = useRef(null);
    const channelRef = useRef(null);
    const lastWhisperTimeRef = useRef(0);

    useEffect(() => {
        if (!conversationId || typeof window === "undefined" || !window.Echo) {
            return;
        }

        const channelName = `chat.${conversationId}`;
        const channel = window.Echo.private(channelName);
        channelRef.current = channel;

        // 1. Listen for incoming messages broadcast by Reverb
        channel.listen(".message.sent", (event) => {
            if (event && event.message) {
                onNewMessage?.(event.message);
            }
        });

        // 2. Listen for client whisper typing events
        channel.listenForWhisper("typing", (event) => {
            if (event && event.userId !== currentUserId) {
                setIsTyping(true);
                setTypingUser(event.userName || "Đối phương");

                if (typingTimerRef.current) {
                    clearTimeout(typingTimerRef.current);
                }
                typingTimerRef.current = setTimeout(() => {
                    setIsTyping(false);
                    setTypingUser(null);
                }, 2500);
            }
        });

        return () => {
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }
            setIsTyping(false);
            setTypingUser(null);
            window.Echo.leave(channelName);
            channelRef.current = null;
        };
    }, [conversationId, currentUserId, onNewMessage]);

    const sendTyping = useCallback(
        (userName) => {
            const now = Date.now();
            if (channelRef.current && now - lastWhisperTimeRef.current > 1500) {
                lastWhisperTimeRef.current = now;
                channelRef.current.whisper("typing", {
                    userId: currentUserId,
                    userName: userName || "Someone",
                });
            }
        },
        [currentUserId],
    );

    return {
        isTyping,
        typingUser,
        sendTyping,
    };
}
