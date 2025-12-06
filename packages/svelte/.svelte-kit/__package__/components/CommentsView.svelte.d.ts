import type { Snippet } from 'svelte';
import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '@threadkit/core';
interface Props {
    comments: CommentType[];
    currentUser?: User;
    maxDepth?: number;
    allowVoting?: boolean;
    sortBy?: SortBy;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
    onSortChange?: (sort: SortBy) => void;
    onPost: (text: string, parentId?: string) => Promise<void>;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    onPin?: (commentId: string) => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onPermalink?: (commentId: string) => void;
    onCollapse?: (commentId: string) => void;
    onReplyStart?: (parentId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    toolbarEnd?: Snippet;
    plugins?: ThreadKitPlugin[];
}
declare const CommentsView: import("svelte").Component<Props, {}, "">;
type CommentsView = ReturnType<typeof CommentsView>;
export default CommentsView;
//# sourceMappingURL=CommentsView.svelte.d.ts.map