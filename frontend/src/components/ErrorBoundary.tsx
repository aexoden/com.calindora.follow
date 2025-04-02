import { Component, ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { error: null, hasError: false };
    }

    static getDerivedStatesFromError(error: Error): ErrorBoundaryState {
        return { error, hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: unknown) {
        console.error("Error caught in ErrorBoundary:", error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
                        <FiAlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                        <h2 className="mb-2 text-xl font-bold text-gray-800">Something went wrong</h2>
                        <p className="mb-4 text-gray-600">
                            We're sorry, but an unexpected error has occurred. Please try refreshing the page.
                        </p>
                        <p className="mb-4 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-left text-sm text-gray-500">
                            {this.state.error?.message ?? "Unknown error"}
                        </p>
                        <button
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="rounded bg-slate-500 px-4 py-2 text-white hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                        >
                            Refresh page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
