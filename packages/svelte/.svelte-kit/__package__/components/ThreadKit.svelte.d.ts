import type { Comment, SortBy, ThreadKitPlugin, User } from '@threadkit/core';
interface Props {
    siteId: string;
    url: string;
    apiKey?: string;
    apiUrl?: string;
    mode?: 'comments' | 'chat';
    theme?: 'light' | 'dark';
    sortBy?: SortBy;
    maxDepth?: number;
    allowVoting?: boolean;
    showLastN?: number;
    autoScroll?: boolean;
    hideBranding?: boolean;
    showPresence?: boolean;
    showTyping?: boolean;
    plugins?: ThreadKitPlugin[];
    initialComments?: Comment[];
    onSignIn?: (user: User) => void;
    onSignOut?: () => void;
    onCommentPosted?: (comment: Comment) => void;
    onCommentReceived?: (comment: Comment) => void;
    onCommentDeleted?: (commentId: string) => void;
    onCommentEdited?: (commentId: string, newText: string) => void;
    onError?: (error: Error) => void;
}
declare const ThreadKit: import("svelte").Component<Props, {}, "">;
type ThreadKit = ReturnType<typeof ThreadKit>;
export default ThreadKit;
//# sourceMappingURL=ThreadKit.svelte.d.ts.map