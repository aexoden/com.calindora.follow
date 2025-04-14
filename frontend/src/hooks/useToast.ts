import { toast as toastService } from "../services/toast";
import { ToastOptions } from "react-hot-toast";

export function useToast() {
    return {
        dismiss: toastService.dismiss,

        error: (message: string, context?: string, options?: Partial<ToastOptions>) =>
            toastService.error({ context, message }, options),
        info: (message: string, context?: string, options?: Partial<ToastOptions>) =>
            toastService.info({ context, message }, options),
        warning: (message: string, context?: string, options?: Partial<ToastOptions>) =>
            toastService.warning({ context, message }, options),
    };
}
