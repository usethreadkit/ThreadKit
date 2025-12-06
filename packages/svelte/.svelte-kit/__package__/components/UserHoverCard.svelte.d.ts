import type { Snippet } from 'svelte';
import type { UserProfile } from '@threadkit/core';
interface Props {
    userName: string;
    userId: string;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    children: Snippet;
}
declare const UserHoverCard: import("svelte").Component<Props, {}, "">;
type UserHoverCard = ReturnType<typeof UserHoverCard>;
export default UserHoverCard;
//# sourceMappingURL=UserHoverCard.svelte.d.ts.map