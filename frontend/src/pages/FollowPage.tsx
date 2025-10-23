/* eslint-disable sort-keys */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import useSWR from "swr";
import { apiService, Report, ReportParams } from "../services/api";
import { useFollowStore } from "../store/followStore";
import FollowMap from "../components/FollowMap";
import StatusPanel from "../components/StatusPanel";
import LoadingError from "../components/LoadingError";
import { useNavigate } from "react-router";
import { useToast } from "../hooks/useToast";
import { ApiError } from "../services/api";
import { useWindowSize } from "../hooks/useWindowSize";
import { useJsApiLoader } from "@react-google-maps/api";
import LoadingIndicator, { LoadingStep } from "../components/LoadingIndicator";

const POLLING_INTERVAL = 5000; // 5 seconds
const REPORT_LIMIT = 1000;
const PRUNE_INTERVAL = 60000; // 1 minute

interface FollowPageProps {
    googleMapsApiKey: string;
}

export default function FollowPage({ googleMapsApiKey }: FollowPageProps) {
    const { deviceKey } = useParams<{ deviceKey: string }>();

    const {
        addReports,
        clearReports,
        pruneReports,
        pruneThreshold,
        setPruneThreshold,
        shouldRefetch,
        settingsDeviceKey,
        trips,
    } = useFollowStore();

    const calculateHistoricalSince = useCallback(() => {
        return new Date(new Date().getTime() - pruneThreshold).toISOString();
    }, [pruneThreshold]);

    const [currentSince, setCurrentSince] = useState(calculateHistoricalSince());

    const [allHistoricalDataLoaded, setAllHistoricalDataLoaded] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [loadedReports, setLoadedReports] = useState<number>(0);

    const toast = useToast();
    const navigate = useNavigate();
    const { screenSize } = useWindowSize();

    // Load Google Maps API
    const { isLoaded: isMapsLoaded } = useJsApiLoader({
        googleMapsApiKey,
        id: "google-map-script",
    });

    const hasAnyData = trips.some((trip) => trip.reports.length > 0);

    const firstRenderRef = useRef(true);
    const prevDeviceKeyRef = useRef<string | undefined>(deviceKey);

    // Clear reports when component mounts or deviceKey changes
    useEffect(() => {
        if (deviceKey && (firstRenderRef.current || prevDeviceKeyRef.current !== deviceKey)) {
            if (settingsDeviceKey) {
                toast.info(
                    "Device-specific settings loading",
                    "Custom map position, colors and time ranges for this device have been loaded.",
                );
            }

            firstRenderRef.current = false;
            prevDeviceKeyRef.current = deviceKey;
        }
    }, [clearReports, deviceKey, calculateHistoricalSince, toast, settingsDeviceKey]);

    // Set up automatic pruning on an interval
    useEffect(() => {
        const pruneTimer = setInterval(() => {
            const oldHasData = trips.some((trip) => trip.reports.length > 0);
            pruneReports();

            // Check if we've pruned all data
            const newHasData = trips.some((trip) => trip.reports.length > 0);

            if (oldHasData && !newHasData) {
                toast.info(
                    "All location data has been pruned",
                    "No location data falls within the selected time range. Try increasing the time range.",
                );
            }
        }, PRUNE_INTERVAL);

        // Clean up the interval on component unmount
        return () => {
            clearInterval(pruneTimer);
        };
    }, [pruneReports, toast, trips]);

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

    // Fetch report count for progress information
    const { data: totalReports } = useSWR<number, Error>(
        deviceKey && deviceExists ? ["reportCount", deviceKey, pruneThreshold] : null,
        async () => {
            const params: ReportParams = {
                since: calculateHistoricalSince(),
            };

            return await apiService.getReportCount(deviceKey ?? "", params);
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            onError: () => {
                toast.error("Failed to load report count", "Progress information may not be accurate.");
            },
        },
    );

    // Listen for prune threshold changes to trigger refetches when increased
    useEffect(() => {
        if (shouldRefetch() && deviceExists && allHistoricalDataLoaded) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsRefetching(true);
            clearReports();
            setLoadedReports(0);
            setCurrentSince(calculateHistoricalSince());
            setAllHistoricalDataLoaded(false);
        }
    }, [deviceExists, clearReports, shouldRefetch, calculateHistoricalSince, allHistoricalDataLoaded]);

    // Load initial data
    const {
        error: initialDataError,
        isLoading: isInitialDataLoading,
        mutate: refetchInitialData,
    } = useSWR<Report[], Error>(
        deviceKey && deviceExists && !allHistoricalDataLoaded ? ["initialReports", deviceKey, currentSince] : null,
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
                toast.error(
                    "Failed to load initial location data",
                    error instanceof Error ? error.message : "Unknown error",
                );
            },
            onSuccess: (data) => {
                if (data.length > 0) {
                    addReports(data);
                    setLoadedReports((prev) => prev + data.length);

                    // Only mark as complete if we got fewer reports than the limit.
                    if (data.length < REPORT_LIMIT) {
                        setAllHistoricalDataLoaded(true);

                        if (isRefetching) {
                            setIsRefetching(false);
                            setPruneThreshold(pruneThreshold);
                        }
                    }

                    setCurrentSince(data[data.length - 1].timestamp);
                } else {
                    setAllHistoricalDataLoaded(true);

                    if (isRefetching) {
                        setIsRefetching(false);
                        setPruneThreshold(pruneThreshold);
                    }
                }
            },
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );

    // Real-time polling for new data
    useSWR<Report[], Error>(
        deviceKey && deviceExists && allHistoricalDataLoaded ? ["pollingReports", deviceKey, currentSince] : null,
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
                    toast.warning(
                        "Error refreshing location data",
                        error instanceof Error ? error.message : "Unknown error",
                    );
                }
            },
            onSuccess: (data) => {
                if (data.length > 0) {
                    addReports(data);
                    setCurrentSince(data[data.length - 1].timestamp);
                }
            },
        },
    );

    // Handle device check error
    const handleDeviceRetry = useCallback(() => {
        void navigate("/");
    }, [navigate]);

    // Function to handle initial data loading retry
    const handleInitialDataRetry = useCallback(() => {
        void refetchInitialData();
    }, [refetchInitialData]);

    // Define loading steps and their states
    const loadingSteps = useMemo<LoadingStep[]>(() => {
        return [
            {
                key: "maps",
                label: "Loading maps",
                status: !isMapsLoaded ? "loading" : "complete",
                relevantFor: ["initial"],
            },
            {
                key: "initialData",
                label: "Loading location data",
                status:
                    deviceExists !== true
                        ? "unstarted"
                        : isInitialDataLoading && !allHistoricalDataLoaded
                          ? "loading"
                          : "complete",
                relevantFor: ["initial"],
            },
            {
                key: "additionalData",
                label: "Loading additional historical data",
                status: !isRefetching ? "unstarted" : allHistoricalDataLoaded ? "complete" : "loading",
                relevantFor: ["refetch"],
            },
        ];
    }, [deviceExists, isMapsLoaded, isInitialDataLoading, allHistoricalDataLoaded, isRefetching]);

    // Determine the current operation type
    const operationType = useMemo<"initial" | "refetch">(() => {
        return isRefetching ? "refetch" : "initial";
    }, [isRefetching]);

    // Calculate if we're in a loading state
    const isLoading = useMemo(() => {
        if (operationType === "initial") {
            const initialSteps = loadingSteps.filter((step) => step.relevantFor.includes("initial"));
            return initialSteps.some((step) => step.status === "loading" || step.status === "unstarted");
        }

        return isRefetching && !allHistoricalDataLoaded;
    }, [operationType, isRefetching, allHistoricalDataLoaded, loadingSteps]);

    // Calculate loading progress
    const loadingProgress = useMemo(() => {
        if (totalReports === undefined || totalReports === 0) return null;
        return Math.min(100, Math.round((loadedReports / totalReports) * 100));
    }, [totalReports, loadedReports]);

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
            <title>{`Following ${deviceKey ?? ""} « Calindora Follow`}</title>

            <div className="flex h-full flex-col md:flex-row">
                {/* Mobile sidebar */}
                <div className="md:hidden">
                    <StatusPanel
                        className="m-2"
                        isMobile={true}
                        deviceKey={deviceKey}
                    />
                </div>

                {/* Desktop sidebar */}
                <div className="hidden p-2 md:block md:w-1/3 lg:w-1/3 xl:w-96!">
                    <StatusPanel
                        className="h-full"
                        isMobile={false}
                        screenSize={screenSize === "sm" ? "md" : screenSize}
                        deviceKey={deviceKey}
                    />
                </div>

                {/* Map container */}
                <div className="relative h-full grow">
                    <FollowMap isLoaded={isMapsLoaded} />

                    {allHistoricalDataLoaded && !hasAnyData && (
                        <div className="bg-opacity-80 absolute inset-0 flex items-center justify-center bg-white">
                            <div className="rounded-lg bg-white p-6 text-center shadow-lg">
                                <h3 className="mb-2 text-xl font-semibold text-slate-700">No Data Available</h3>
                                <p className="mb-4 text-gray-600">
                                    No location data was found for this device within the selected time range.
                                </p>
                                <p className="text-sm text-gray-600">
                                    Try selecting a longer time range from the sidebar or check back later for updates.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="bg-opacity-80 absolute inset-0 z-50 bg-white">
                        <LoadingIndicator
                            steps={loadingSteps}
                            operationType={operationType}
                            progress={loadingProgress}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
