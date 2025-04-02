import { useContext } from "react";
import { AppError, ErrorContext } from "../context/ErrorContext";

export function useError() {
    const context = useContext(ErrorContext);

    if (context === undefined) {
        throw new Error("useError must be used within an ErrorProvider");
    }

    return context;
}

export function createError(
    message: string,
    severity: "error" | "warning" | "info" = "error",
    context?: string,
): AppError {
    return {
        context,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        message,
        severity,
    };
}
