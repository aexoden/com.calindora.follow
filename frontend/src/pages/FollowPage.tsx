/* eslint-disable sort-keys */
import { useMemo } from "react";
import { useParams } from "react-router";
import FollowMap from "../components/FollowMap";
import StatusPanel from "../components/StatusPanel";
import LoadingError from "../components/LoadingError";
import { useNavigate } from "react-router";
import { useWindowSize } from "../hooks/useWindowSize";
import { useJsApiLoader } from "@react-google-maps/api";
import { useDeviceReports } from "../hooks/useDeviceReports";
import LoadingIndicator, { LoadingStep } from "../components/LoadingIndicator";

interface FollowPageProps {
    googleMapsApiKey: string;
}

export default function FollowPage({ googleMapsApiKey }: FollowPageProps) {
    const { deviceKey } = useParams<{ deviceKey: string }>();
    const { screenSize } = useWindowSize();
    const navigate = useNavigate();

    // Load Google Maps API
    const { isLoaded: isMapsLoaded } = useJsApiLoader({
        googleMapsApiKey,
        id: "google-map-script",
    });

    const {
        status: fetchStatus,
        error: _fetchError,
        progress: fetchProgress,
        hasData,
        isLoading,
    } = useDeviceReports(deviceKey);

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
                key: "device",
                label: "Verifying device",
                status:
                    fetchStatus === "idle" ? "unstarted" : fetchStatus === "checking_device" ? "loading" : "complete",
                relevantFor: ["initial"],
            },
            {
                key: "initialData",
                label: "Loading location data",
                status:
                    fetchStatus === "idle" || fetchStatus === "checking_device" || fetchStatus === "device_not_found"
                        ? "unstarted"
                        : isLoading
                          ? "loading"
                          : "complete",
                relevantFor: ["initial", "refetch"],
            },
        ];
    }, [isMapsLoaded, fetchStatus, isLoading]);

    // If device doesn't exist or there's a device error.
    if (fetchStatus === "device_not_found") {
        return (
            <>
                <title>Device Not Found « Calindora Follow</title>
                <LoadingError
                    isLoading={false}
                    error={new Error("Device not found")}
                    onRetry={() => void navigate("/")}
                    errorTitle="Device Not Found"
                    errorMessage={`We couldn't find the device with key "${deviceKey ?? ""}". Please check the key and try again.`}
                >
                    <div />
                </LoadingError>
            </>
        );
    }

    // If there's an error loading initial data.
    /*
    // TODO: Needs refactoring.
    if (fetchError && fetchStatus !== "loading_initial_data" && fetchStatus !== "loading_additional_data") {
        return (
            <>
                <title>Error Loading Data « Calindora Follow</title>
                <LoadingError
                    isLoading={false}
                    error={fetchError}
                    onRetry={retryDataLoading}
                    errorTitle="Error Loading Data"
                    errorMessage="We encountered a problem loading the location data. Please try again."
                >
                    <div />
                </LoadingError>
            </>
        );
    } */

    return (
        <>
            <title>{`Following ${deviceKey ? deviceKey.toString() : ""} « Calindora Follow`}</title>

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
                <div className="hidden p-2 md:block md:w-1/3 lg:w-1/3 xl:!w-96">
                    <StatusPanel
                        className="h-full"
                        isMobile={false}
                        screenSize={screenSize === "sm" ? "md" : screenSize}
                        deviceKey={deviceKey}
                    />
                </div>

                {/* Map container */}
                <div className="relative h-full flex-grow">
                    <FollowMap isLoaded={isMapsLoaded} />

                    {fetchStatus === "fetching_reports" && !isLoading && !hasData && (
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
                {fetchStatus === "fetching_reports" && isLoading && (
                    <div className="bg-opacity-80 absolute inset-0 z-50 bg-white">
                        <LoadingIndicator
                            steps={loadingSteps}
                            operationType="initial"
                            progress={fetchProgress}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
