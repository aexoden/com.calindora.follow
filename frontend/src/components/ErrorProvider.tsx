import { ReactNode, useState } from "react";
import { AppError } from "../context/ErrorContext";
import { ErrorContext } from "../context/ErrorContext";
import ErrorToasts from "../components/ErrorToasts";

export function ErrorProvider({ children }: { children: ReactNode }) {
    const [errors, setErrors] = useState<AppError[]>([]);

    const addError = (error: AppError) => {
        setErrors((prev) => [...prev, error]);
    };

    const removeError = (id: string) => {
        setErrors((prev) => prev.filter((error) => error.id !== id));
    };

    const clearErrors = () => {
        setErrors([]);
    };

    return (
        <ErrorContext.Provider value={{ addError, clearErrors, errors, removeError }}>
            {children}
            <ErrorToasts />
        </ErrorContext.Provider>
    );
}
