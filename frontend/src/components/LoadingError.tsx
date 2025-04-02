import { ReactNode } from "react";
import { FiLoader, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

interface LoadingErrorProps {
    isLoading: boolean;
    error: Error | null;
    onRetry?: () => void;
    loadingMessage?: string;
    errorTitle?: string;
    errorMessage?: string;
    children: ReactNode;
}

export default function LoadingError({
    isLoading,
    error,
    onRetry,
    loadingMessage = "Loading...",
    errorTitle = "Error",
    errorMessage,
    children,
}: LoadingErrorProps) {
    if (isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4">
                <div className="flex items-center space-x-2">
                    <FiLoader className="h-6 w-6 animate-spin text-slate-500" />
                    <span className="text-slate-700">{loadingMessage}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4">
                <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
                    <FiAlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                    <h2 className="mb-2 text-xl font-bold text-gray-800">{errorTitle}</h2>
                    <p className="mb-4 text-gray-600">
                        {errorMessage ?? (error.message || "An error occurred while loading the data.")}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mx-auto flex items-center justify-center space-x-2 rounded bg-slate-500 px-4 py-2 text-white hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                        >
                            <FiRefreshCw className="w4 h-4" />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
