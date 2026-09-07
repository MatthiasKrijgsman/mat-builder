import { Component, type ErrorInfo, type ReactNode } from "react";
import type { BlockErrorContext } from "../../react/store.ts";

/*
 * Per-block error boundary (docs/04 §BlockFrame). A consumer block's
 * `editRender` or inspector form that throws — on a prop shape it did not
 * expect, say — must cost that one block, not the editor: without a
 * boundary React unmounts the whole tree, the pending autosave with it.
 *
 * The boundary resets when `resetKey` changes (the block's props object),
 * so fixing the offending prop in the inspector — or undoing — brings the
 * block back without a remount of anything else.
 */

interface BlockErrorBoundaryProps {
    context: BlockErrorContext;
    onError?: (error: unknown, context: BlockErrorContext) => void;
    /** Changing it clears a caught error and re-renders the children */
    resetKey: unknown;
    fallback: (error: unknown) => ReactNode;
    children: ReactNode;
}

interface BlockErrorBoundaryState {
    error: unknown;
    failed: boolean;
}

export class BlockErrorBoundary extends Component<BlockErrorBoundaryProps, BlockErrorBoundaryState> {
    state: BlockErrorBoundaryState = { error: null, failed: false };

    static getDerivedStateFromError(error: unknown): BlockErrorBoundaryState {
        return { error, failed: true };
    }

    componentDidCatch(error: unknown, info: ErrorInfo): void {
        this.props.onError?.(error, { ...this.props.context, componentStack: info.componentStack ?? undefined });
    }

    componentDidUpdate(previous: BlockErrorBoundaryProps): void {
        if (this.state.failed && previous.resetKey !== this.props.resetKey) {
            this.setState({ error: null, failed: false });
        }
    }

    render(): ReactNode {
        return this.state.failed ? this.props.fallback(this.state.error) : this.props.children;
    }
}

/** One line of what went wrong, for the fallbacks. */
export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);
