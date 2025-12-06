interface Props {
    parentId?: string;
    placeholder?: string;
    showCancel?: boolean;
}
interface $$__sveltets_2_IsomorphicComponent<Props extends Record<string, any> = any, Events extends Record<string, any> = any, Slots extends Record<string, any> = any, Exports = {}, Bindings = string> {
    new (options: import('svelte').ComponentConstructorOptions<Props>): import('svelte').SvelteComponent<Props, Events, Slots> & {
        $$bindings?: Bindings;
    } & Exports;
    (internal: unknown, props: Props & {
        $$events?: Events;
        $$slots?: Slots;
    }): Exports & {
        $set?: any;
        $on?: any;
    };
    z_$$bindings?: Bindings;
}
declare const CommentForm: $$__sveltets_2_IsomorphicComponent<Props, {
    submit: CustomEvent<{
        text: string;
        parentId?: string;
    }>;
    cancel: CustomEvent<void>;
} & {
    [evt: string]: CustomEvent<any>;
}, {}, {}, "">;
type CommentForm = InstanceType<typeof CommentForm>;
export default CommentForm;
//# sourceMappingURL=CommentForm.svelte.d.ts.map