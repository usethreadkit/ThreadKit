import type { Comment, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
interface Props {
    message: Comment;
    currentUser?: User;
    isModOrAdmin: boolean;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
}
declare const ChatMessage: import("svelte").Component<Props, {}, "">;
type ChatMessage = ReturnType<typeof ChatMessage>;
export default ChatMessage;
//# sourceMappingURL=ChatMessage.svelte.d.ts.map