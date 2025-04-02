/* eslint-disable sort-keys */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import useSWR from "swr";
import { apiService, Report, ReportParams } from "../services/api";
import { useFollowStore } from "../store/followStore";
import FollowMap from "../components/FollowMap";
import StatusPanel from "../components/StatusPanel";
import LoadingError from "../components/LoadingError";
import { useNavigate } from "react-router";
import { useError, createError } from "../hooks/useError";
import { ApiError } from "../services/api";

const INITIAL_DATA_DURATION = 86400 * 1000 * 2; // 2 days
const POLLING_INTERVAL = 5000; // 5 seconds
const REPORT_LIMIT = 1000;
const PRUNE_INTERVAL = 60000; // 1 minute

export default function FollowPage() {
    const { deviceKey } = useParams<{ deviceKey: string }>();
    const [currentSince, setCurrentSince] = useState(
        new Date(new Date().getTime() - INITIAL_DATA_DURATION).toISOString(),
    );
    const [isComplete, setIsComplete] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const navigate = useNavigate();
    const { addReports, clearReports, pruneReports, pruneThreshold, setPruneThreshold, shouldRefetch } =
        useFollowStore();
    const { addError } = useError();

    const calculateHistoricalSince = useCallback(() => {
        return new Date(new Date().getTime() - pruneThreshold).toISOString();
    }, [pruneThreshold]);

    const firstRenderRef = useRef(true);
    const prevDeviceKeyRef = useRef<string | undefined>(deviceKey);

    // Clear reports when component mounts or deviceKey changes
    useEffect(() => {
        if (firstRenderRef.current || prevDeviceKeyRef.current !== deviceKey) {
            clearReports();
            setIsComplete(false);
            setCurrentSince(calculateHistoricalSince());

            firstRenderRef.current = false;
            prevDeviceKeyRef.current = deviceKey;
        }
    }, [clearReports, deviceKey, calculateHistoricalSince]);

    // Set up automatic pruning on an interval
    useEffect(() => {
        const pruneTimer = setInterval(() => {
            pruneReports();
        }, PRUNE_INTERVAL);

        // Clean up the interval on component unmount
        return () => {
            clearInterval(pruneTimer);
        };
    }, [pruneReports]);

    // Check if device exists
    const {
        data: deviceExists,
        error: deviceError,
        isLoading: isDeviceLoading,
    } = useSWR<boolean, Error>(deviceKey ? ["deviceCheck", deviceKey] : null, async () => {
        try {
            return await apiService.checkDeviceExists(deviceKey ?? "");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return false;
            }

            throw error;
        }
    });

    // Listen for prune threshold changes to trigger refetches when increased
    useEffect(() => {
        if (shouldRefetch() && deviceExists && isComplete) {
            setIsRefetching(true);
            setCurrentSince(calculateHistoricalSince());
            setIsComplete(false);
        }
    }, [deviceExists, isComplete, shouldRefetch, calculateHistoricalSince]);

    // Load initial data
    const {
        data: initialReports,
        error: initialDataError,
        isLoading: isInitialDataLoading,
        mutate: refetchInitialData,
    } = useSWR<Report[], Error>(
        deviceKey && deviceExists && !isComplete ? ["initialReports", deviceKey, currentSince] : null,
        async () => {
            const params: ReportParams = {
                limit: REPORT_LIMIT,
                order: "asc",
                since: currentSince,
            };

            return await apiService.getReports(deviceKey ?? "", params);
        },
        {
            onError: (error) => {
                addError(
                    createError(
                        "Failed to load initial location data",
                        "error",
                        error instanceof Error ? error.message : "Unknown error",
                    ),
                );
            },
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );

    // Process initial data
    useEffect(() => {
        if (initialReports && initialReports.length > 0) {
            addReports(initialReports);

            // Only mark as complete if we got fewer reports than the limit.
            if (initialReports.length < REPORT_LIMIT) {
                setIsComplete(true);

                if (isRefetching) {
                    setIsRefetching(false);
                    setPruneThreshold(pruneThreshold);
                }
            }

            setCurrentSince(initialReports[initialReports.length - 1].timestamp);
        } else if (initialReports && initialReports.length === 0) {
            setIsComplete(true);

            if (isRefetching) {
                setIsRefetching(false);
                setPruneThreshold(pruneThreshold);
            }
        }
    }, [addReports, initialReports, isRefetching, pruneThreshold, setPruneThreshold]);

    // Real-time polling for new data
    const { data: polledReports } = useSWR<Report[], Error>(
        deviceKey && deviceExists && isComplete ? ["pollingReports", deviceKey, currentSince] : null,
        async () => {
            const params: ReportParams = {
                limit: REPORT_LIMIT,
                order: "asc",
                since: currentSince,
            };

            return await apiService.getReports(deviceKey ?? "", params);
        },
        {
            refreshInterval: POLLING_INTERVAL,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: POLLING_INTERVAL - 500,
            onError: (error) => {
                if (!(error instanceof ApiError) || error.status !== 429) {
                    addError(
                        createError(
                            "Error refreshing location data",
                            "warning",
                            error instanceof Error ? error.message : "Unknown error",
                        ),
                    );
                }
            },
        },
    );

    // Process polled data
    useEffect(() => {
        if (polledReports && polledReports.length > 0) {
            addReports(polledReports);
            setCurrentSince(polledReports[polledReports.length - 1].timestamp);
        }
    }, [addReports, polledReports]);

    // Handle device check error
    const handleDeviceRetry = useCallback(() => {
        void navigate("/");
    }, [navigate]);

    // Function to handle initial data loading retry
    const handleInitialDataRetry = useCallback(() => {
        void refetchInitialData();
    }, [refetchInitialData]);

    // If device doesn't exist or there's a device error.
    if (deviceExists === false || deviceError) {
        return (
            <>
                <title>Device Not Found « Calindora Follow</title>
                <LoadingError
                    isLoading={isDeviceLoading}
                    error={deviceError ?? new Error("Device not found")}
                    onRetry={handleDeviceRetry}
                    errorTitle="Device Not Found"
                    errorMessage={`We couldn't find the device with key "${deviceKey ?? ""}". Please check the key and try again.`}
                >
                    <div />
                </LoadingError>
            </>
        );
    }

    // If there's an error loading initial data.
    if (initialDataError) {
        return (
            <>
                <title>Error Loading Data « Calindora Follow</title>
                <LoadingError
                    isLoading={false}
                    error={initialDataError}
                    onRetry={handleInitialDataRetry}
                    errorTitle="Error Loading Data"
                    errorMessage="We encountered a problem loading the location data. Please try again."
                >
                    <div />
                </LoadingError>
            </>
        );
    }

    // Main UI
    return (
        <>
            <title>{`Following ${deviceKey ? deviceKey.toString() : ""} « Calindora Follow`}</title>
            <LoadingError
                isLoading={isDeviceLoading || isInitialDataLoading || isRefetching}
                error={null}
                loadingMessage={isRefetching ? "Loading additional historical data..." : "Loading location data..."}
            >
                <div className="flex h-full flex-col md:flex-row">
                    {/* Mobile sidebar */}
                    <div className="md:hidden">
                        <StatusPanel
                            className="m-2"
                            isMobile={true}
                        />
                    </div>

                    {/* Desktop sidebar */}
                    <div className="hidden p-2 md:block md:w-1/4 lg:w-1/5">
                        <StatusPanel
                            className="h-full"
                            isMobile={false}
                        />
                    </div>

                    {/* Map container */}
                    <div className="h-full flex-grow md:w-3/4 lg:w-4/5">
                        <FollowMap />
                    </div>
                </div>
            </LoadingError>
        </>
    );
}
