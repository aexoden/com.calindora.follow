import { createContext } from "react";

interface ErrorContextType {
    errors: AppError[];
    addError: (error: AppError) => void;
    removeError: (id: string) => void;
    clearErrors: () => void;
}

export interface AppError {
    id: string;
    message: string;
    severity: "error" | "warning" | "info";
    context?: string;
    timeout?: number;
}

export const ErrorContext = createContext<ErrorContextType | undefined>(undefined);
