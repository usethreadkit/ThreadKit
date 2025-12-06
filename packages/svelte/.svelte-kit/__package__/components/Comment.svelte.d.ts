import type { Comment as CommentType, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
import Comment from './Comment.svelte';
interface Props {
    comment: CommentType;
    currentUser?: User;
    depth?: number;
    maxDepth?: number;
    collapsed?: boolean;
    highlighted?: boolean;
    index?: number;
    totalSiblings?: number;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
    onReply?: (commentId: string) => void;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onPermalink?: (commentId: string) => void;
    onPrev?: () => void;
    onNext?: () => void;
    onCollapse?: (commentId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
}
declare const Comment: import("svelte").Component<Props, {}, "">;
type Comment = ReturnType<typeof Comment>;
export default Comment;
//# sourceMappingURL=Comment.svelte.d.ts.map