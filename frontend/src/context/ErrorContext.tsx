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
}

export const ErrorContext = createContext<ErrorContextType | undefined>(undefined);
