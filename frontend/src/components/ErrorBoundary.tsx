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
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
                        <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">
                            We're sorry, but an unexpected error has occurred. Please try refreshing the page.
                        </p>
                        <p className="text-sm text-gray-500 mb-4 overflow-auto max-h-32 text-left p-2 bg-gray-50 rounded">
                            {this.state.error?.message ?? "Unknown error"}
                        </p>
                        <button
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="bg-slate-500 text-white py-2 px-4 rounded hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
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
