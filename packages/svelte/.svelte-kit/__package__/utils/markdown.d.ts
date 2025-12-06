import { type ThreadKitPlugin, type UserProfile } from '@threadkit/core';
export interface MarkdownOptions {
    allowLinks?: boolean;
    enableAutoLinks?: boolean;
    enableMentions?: boolean;
    plugins?: ThreadKitPlugin[];
    getUserProfile?: (userId: string) => UserProfile | undefined;
    resolveUsername?: (username: string) => string | undefined;
}
export declare function renderMarkdown(text: string, options?: MarkdownOptions): string;
export { formatTimestamp, formatTime } from '@threadkit/core';
//# sourceMappingURL=markdown.d.ts.map