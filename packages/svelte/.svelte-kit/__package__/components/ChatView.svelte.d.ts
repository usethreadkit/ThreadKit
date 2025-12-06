import type { Snippet } from 'svelte';
import type { Comment, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
interface Props {
    comments: Comment[];
    currentUser?: User;
    showLastN?: number;
    autoScroll?: boolean;
    showPresence?: boolean;
    presenceCount?: number;
    typingUsers?: Array<{
        userId: string;
        userName: string;
    }>;
    onSend: (text: string) => Promise<void>;
    onTyping?: () => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    toolbarEnd?: Snippet;
    plugins?: ThreadKitPlugin[];
}
declare const ChatView: import("svelte").Component<Props, {}, "">;
type ChatView = ReturnType<typeof ChatView>;
export default ChatView;
//# sourceMappingURL=ChatView.svelte.d.ts.map