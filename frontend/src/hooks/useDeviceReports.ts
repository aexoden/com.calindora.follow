import { useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { useFollowStore } from "../store/followStore";
import { apiService, ReportParams, Report } from "../services/api";
import { useToast } from "./useToast";

type FetchStatus = "idle" | "checking_device" | "device_not_found" | "fetching_count" | "fetching_reports";

interface DeviceReportsState {
    currentOperation: string | null;
    currentSince: string;
    deviceCheckStarted: boolean;
    error: Error | null;
    fetchedReports: number;
    operationInProgress: boolean;
    status: FetchStatus;
    totalReports: number;
}

type DeviceReportsAction =
    | { type: "CHECK_DEVICE_START" }
    | { type: "CHECK_DEVICE_FAILURE"; error: Error }
    | { type: "FETCH_COUNT_START" }
    | { type: "FETCH_COUNT_SUCCESS"; count: number }
    | { type: "FETCH_COUNT_FAILURE"; error: Error }
    | { type: "FETCH_REPORT_SUCCESS"; reports: Report[]; timestamp: string }
    | { type: "FETCH_REPORT_FAILURE"; error: Error }
    | { type: "OPERATION_START"; operationName: string }
    | { type: "OPERATION_COMPLETE" }
    | { type: "RETRY_DEVICE_CHECK" }
    | { type: "RESET" };

const POLLING_INTERVAL = 5000;
const PRUNE_INTERVAL = 60000;
const REPORT_LIMIT = 1000;

const initialState: DeviceReportsState = {
    currentOperation: null,
    currentSince: "",
    deviceCheckStarted: false,
    error: null,
    fetchedReports: 0,
    operationInProgress: false,
    status: "idle",
    totalReports: 0,
};

function deviceReportsReducer(state: DeviceReportsState, action: DeviceReportsAction): DeviceReportsState {
    switch (action.type) {
        case "CHECK_DEVICE_START":
            return {
                ...state,
                deviceCheckStarted: true,
                error: null,
                status: "checking_device",
            };

        case "CHECK_DEVICE_FAILURE":
            return {
                ...state,
                error: action.error,
                status: "device_not_found",
            };

        case "FETCH_COUNT_START":
            return {
                ...state,
                currentSince: "",
                fetchedReports: 0,
                status: "fetching_count",
            };

        case "FETCH_COUNT_SUCCESS":
            return {
                ...state,
                status: "fetching_reports",
                totalReports: action.count,
            };

        case "FETCH_COUNT_FAILURE":
            return {
                ...state,
                error: action.error,
                status: "fetching_reports",
            };

        case "FETCH_REPORT_SUCCESS":
            return {
                ...state,
                currentSince: action.timestamp,
                fetchedReports: state.fetchedReports + action.reports.length,
            };

        case "FETCH_REPORT_FAILURE":
            return {
                ...state,
                error: action.error,
            };

        case "OPERATION_START":
            if (state.operationInProgress) return state;
            return {
                ...state,
                currentOperation: action.operationName,
                operationInProgress: true,
            };

        case "OPERATION_COMPLETE":
            return {
                ...state,
                currentOperation: null,
                operationInProgress: false,
            };

        case "RETRY_DEVICE_CHECK":
            return {
                ...state,
                deviceCheckStarted: false,
                error: null,
                status: "idle",
            };

        case "RESET":
            return {
                ...initialState,
            };

        default:
            return state;
    }
}

export function useDeviceReports(deviceKey: string | undefined) {
    const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const fetchReportsRef = useRef<() => Promise<void>>(null);

    const toast = useToast();

    const { addReports, clearReports, pruneThreshold, pruneReports, setPruneThreshold, shouldRefetch, trips } =
        useFollowStore();

    const [state, dispatch] = useReducer(deviceReportsReducer, initialState);

    const calculateSince = useCallback(() => {
        return new Date(new Date().getTime() - pruneThreshold).toISOString();
    }, [pruneThreshold]);

    const hasData = useMemo(() => {
        return trips.some((trip) => trip.reports.length > 0);
    }, [trips]);

    // Check if device exists
    const checkDevice = useCallback(async () => {
        if (!deviceKey || state.deviceCheckStarted) return;

        dispatch({ type: "CHECK_DEVICE_START" });

        try {
            const exists = await apiService.checkDeviceExists(deviceKey);

            if (!isMountedRef.current) return false;

            if (exists) {
                dispatch({ type: "FETCH_COUNT_START" });
            } else {
                dispatch({
                    error: new Error(`Device not found: ${deviceKey}`),
                    type: "CHECK_DEVICE_FAILURE",
                });
            }

            return exists;
        } catch (error) {
            if (!isMountedRef.current) return false;

            dispatch({
                error: error as Error,
                type: "CHECK_DEVICE_FAILURE",
            });

            return false;
        }
    }, [deviceKey, state.deviceCheckStarted]);

    // Fetch report count
    const fetchReportCount = useCallback(async () => {
        if (!deviceKey || state.status !== "fetching_count" || state.operationInProgress) return;

        dispatch({ operationName: "fetchReportCount", type: "OPERATION_START" });

        try {
            const params: ReportParams = {
                since: state.currentSince || calculateSince(),
            };

            const count = await apiService.getReportCount(deviceKey, params);

            if (!isMountedRef.current) return;

            dispatch({
                count,
                type: "FETCH_COUNT_SUCCESS",
            });
        } catch (error) {
            if (!isMountedRef.current) return;

            toast.warning("Failed to load report count", "Progress information may not be accurate");

            dispatch({
                error: error as Error,
                type: "FETCH_COUNT_FAILURE",
            });
        } finally {
            dispatch({ type: "OPERATION_COMPLETE" });
        }
    }, [deviceKey, state.status, state.operationInProgress, state.currentSince, calculateSince, toast]);

    const fetchReports = useCallback(async () => {
        if (!deviceKey || state.status !== "fetching_reports" || state.operationInProgress || fetchTimerRef.current)
            return;

        dispatch({ operationName: "fetchReports", type: "OPERATION_START" });

        let fetchDelay = POLLING_INTERVAL;

        try {
            const params: ReportParams = {
                limit: REPORT_LIMIT,
                order: "asc",
                since: state.currentSince || calculateSince(),
            };

            const reports = await apiService.getReports(deviceKey, params);

            if (!isMountedRef.current) return;

            if (reports.length > 0) {
                addReports(reports);

                dispatch({
                    reports,
                    timestamp: reports[reports.length - 1].timestamp,
                    type: "FETCH_REPORT_SUCCESS",
                });

                if (reports.length === REPORT_LIMIT) {
                    fetchDelay = 0;
                }
            }
        } catch (error) {
            if (!isMountedRef.current) return;

            toast.error(
                "Failed to load location data",
                error instanceof Error ? error.message : "An unknown error occurred",
            );

            dispatch({
                error: error as Error,
                type: "FETCH_REPORT_FAILURE",
            });
        } finally {
            dispatch({ type: "OPERATION_COMPLETE" });
        }

        fetchTimerRef.current = setTimeout(() => {
            fetchTimerRef.current = null;
            void fetchReportsRef.current?.();
        }, fetchDelay);
    }, [addReports, calculateSince, deviceKey, state.currentSince, state.operationInProgress, state.status, toast]);

    // Keep fetchReportsRef updated
    useEffect(() => {
        fetchReportsRef.current = fetchReports;
    }, [fetchReports]);

    // Refetch data
    const refetch = useCallback(() => {
        if (!deviceKey) return;

        // This will reset the shouldRefetch state
        setPruneThreshold(pruneThreshold);

        if (fetchTimerRef.current) {
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = null;
        }

        clearReports();

        dispatch({
            type: "FETCH_COUNT_START",
        });
    }, [deviceKey, setPruneThreshold, pruneThreshold, clearReports]);

    // Retry device check
    const retryDeviceCheck = useCallback(() => {
        if (!deviceKey) return;

        dispatch({ type: "RETRY_DEVICE_CHECK" });
    }, [deviceKey]);

    // Refetch data if needed
    useEffect(() => {
        if (shouldRefetch() && state.status === "fetching_reports") {
            refetch();
        }
    }, [refetch, shouldRefetch, state.status]);

    // Initialization whenever deviceKey changes
    useEffect(() => {
        if (!deviceKey) return;

        isMountedRef.current = true;

        if (fetchTimerRef.current) {
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = null;
        }

        clearReports();

        dispatch({
            type: "RESET",
        });

        return () => {
            isMountedRef.current = false;

            if (fetchTimerRef.current) {
                clearTimeout(fetchTimerRef.current);
                fetchTimerRef.current = null;
            }
        };
    }, [clearReports, deviceKey]);

    // Periodic pruning of reports
    useEffect(() => {
        const pruneTimer = setInterval(() => {
            pruneReports();
        }, PRUNE_INTERVAL);

        return () => {
            clearInterval(pruneTimer);
        };
    }, [pruneReports]);

    // Dispatch based on status
    useEffect(() => {
        if (state.status === "idle") {
            void checkDevice();
        } else if (state.status === "fetching_count") {
            void fetchReportCount();
        } else if (state.status === "fetching_reports") {
            void fetchReports();
        }
    }, [checkDevice, fetchReportCount, fetchReports, state.status]);

    return {
        error: state.error,
        hasData,
        isLoading: state.fetchedReports < state.totalReports,
        progress:
            state.totalReports > 0
                ? Math.min(100, Math.round((state.fetchedReports / state.totalReports) * 100))
                : null,
        refetch,
        retryDeviceCheck,
        status: state.status,
    };
}
