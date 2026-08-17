import { Component, type ErrorInfo, type ReactNode } from "react";

// Catches anything the Rive subtree throws — a failed chunk fetch for the lazy
// runtime, a WASM instantiation refusal, a malformed .riv. React error
// boundaries must be class components; this is the only one in the app and it
// exists purely so Will's rule holds: "The mascot must never be a blank box."

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class RiveErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Non-fatal by design — log it so a broken .riv is visible in monitoring
    // rather than silently degrading to the static mascot forever.
    console.warn("Cora mascot: Rive subtree failed, using static fallback", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
