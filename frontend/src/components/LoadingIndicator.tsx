import { FiLoader, FiCheck, FiCircle } from "react-icons/fi";

export type LoadingStepStatus = "unstarted" | "loading" | "complete";

export interface LoadingStep {
    key: string;
    label: string;
    status: LoadingStepStatus;
    relevantFor: ("initial" | "refetch")[];
}

interface LoadingIndicatorProps {
    steps: LoadingStep[];
    operationType: "initial" | "refetch";
    className?: string;
    progress?: number | null;
}

export default function LoadingIndicator({
    steps,
    operationType,
    className = "",
    progress = null,
}: LoadingIndicatorProps) {
    // Filter steps to only include those relevant for the current operation type
    const relevantSteps = steps.filter((step) => step.relevantFor.includes(operationType));

    // Find the current step that is loading
    const currentStep = relevantSteps.find((step) => step.status === "loading");

    // Check if all steps are complete
    const allStepsComplete = relevantSteps.every((step) => step.status === "complete");

    return (
        <div className={`flex h-full items-center justify-center p-4 ${className}`}>
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center space-x-3">
                    {allStepsComplete ? (
                        <>
                            <FiCheck className="h-6 w-6 text-green-500" />
                            <span className="text-lg font-medium text-green-700">Loading complete</span>
                        </>
                    ) : (
                        <>
                            <FiLoader className="h-6 w-6 animate-spin text-blue-500" />
                            <span className="text-lg font-medium text-slate-700">
                                {currentStep ? currentStep.label : "Loading..."}
                            </span>
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    {relevantSteps.map((step) => (
                        <div
                            key={step.key}
                            className="flex items-center"
                        >
                            <div className="mr-3">
                                {step.status === "complete" ? (
                                    <FiCheck className="h-5 w-5 text-green-500" />
                                ) : step.status === "loading" ? (
                                    <FiLoader className="h-5 w-5 animate-spin text-blue-500" />
                                ) : (
                                    <FiCircle className="h-5 w-5 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <span
                                    className={`text-sm font-medium ${
                                        step.status === "complete"
                                            ? "text-green-600"
                                            : step.status === "loading"
                                              ? "text-blue-600"
                                              : "text-gray-500"
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {progress !== null && (
                    <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-gray-600">
                            <span>Loading historical data</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress.toString()}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
