import { FiAlertTriangle, FiX } from "react-icons/fi";
import { useError } from "../hooks/useError";

export default function ErrorToasts() {
    const { errors, removeError } = useError();

    if (errors.length === 0) return null;

    return (
        <div className="fixed right-4 bottom-4 z-50 flex max-w-md flex-col gap-2">
            {errors.map((error) => (
                <div
                    key={error.id}
                    className={`animate-fadeIn flex items-start gap-3 rounded-md p-4 shadow-lg ${
                        error.severity === "error"
                            ? "border-l-4 border-red-500 bg-red-50 text-red-800"
                            : error.severity === "warning"
                              ? "border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800"
                              : "border-l-4 border-blue-500 bg-blue-50 text-blue-800"
                    }`}
                >
                    <div className="mt-0.5 flex-shrink-0">
                        <FiAlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium">{error.message}</p>
                        {error.context && <p className="mt-1 text-xs opacity-75">{error.context}</p>}
                    </div>
                    <button
                        onClick={() => {
                            removeError(error.id);
                        }}
                        className="-mt-1-mr-1 ml-auto flex-shrink-0 rounded-full p-1 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        aria-label="Dismiss"
                    >
                        <FiX className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

const styleTag = document.createElement("style");

styleTag.textContent = `
    @keyframes fadeIn {
        from { opacity: 0, transform: translateY(10px); }
        to { opacity: 1, transform: translateY(0); }
    }

    .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;}
`;

document.head.appendChild(styleTag);
