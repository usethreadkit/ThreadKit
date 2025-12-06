interface Props {
    parentId?: string;
    placeholder?: string;
    showCancel?: boolean;
    onSubmit?: (text: string, parentId?: string) => Promise<void>;
    onCancel?: () => void;
}
declare const CommentForm: import("svelte").Component<Props, {}, "">;
type CommentForm = ReturnType<typeof CommentForm>;
export default CommentForm;
//# sourceMappingURL=CommentForm.svelte.d.ts.map