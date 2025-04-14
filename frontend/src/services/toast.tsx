import { toast as reactHotToast } from "react-hot-toast";
import { ToastOptions } from "react-hot-toast";
import { FiAlertTriangle } from "react-icons/fi";
import { JSX } from "react";

export type ToastType = "info" | "warning" | "error";

interface ToastContent {
    message: string;
    context?: string;
}

const toastOptions: Record<ToastType, ToastOptions> = {
    error: {
        duration: 0,
    },
    info: {
        duration: 5000,
        icon: "🔵",
    },
    warning: {
        duration: 8000,
        icon: <FiAlertTriangle color="#F59E0B" />,
    },
};

const formatMessage = ({ message, context }: ToastContent): string | JSX.Element => {
    if (!context) return message;

    return (
        <div>
            <div>{message}</div>
            <div className="mt-1 text-xs opacity-75">{context}</div>
        </div>
    );
};

export const showToast = (
    type: ToastType,
    { message, context }: ToastContent,
    customOptions?: Partial<ToastOptions>,
): string => {
    const content = formatMessage({ context, message });
    const options = { ...toastOptions[type], ...customOptions };

    switch (type) {
        case "info":
            return reactHotToast.success(content, options).toString();
        case "warning":
            return reactHotToast(content, options).toString();
        case "error":
            return reactHotToast.error(content, options).toString();
    }
};

// Convenience functions
export const toast = {
    dismiss: (toastId?: string) => {
        reactHotToast.dismiss(toastId);
    },
    error: (content: ToastContent, options?: Partial<ToastOptions>) => showToast("error", content, options),
    info: (content: ToastContent, options?: Partial<ToastOptions>) => showToast("info", content, options),
    warning: (content: ToastContent, options?: Partial<ToastOptions>) => showToast("warning", content, options),
};
