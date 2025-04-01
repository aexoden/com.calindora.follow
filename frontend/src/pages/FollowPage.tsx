/* eslint-disable sort-keys */
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useSWR from "swr";
import { apiService, ReportParams } from "../services/api";
import { useFollowStore } from "../store/followStore";
import FollowMap from "../components/FollowMap";
import StatusPanel from "../components/StatusPanel";

const INITIAL_DATA_DURATION = 86400 * 1000 * 2; // 2 days
const POLLING_INTERVAL = 5000; // 5 seconds
const REPORT_LIMIT = 1000;

export default function FollowPage() {
    const { deviceKey } = useParams<{ deviceKey: string }>();
    const [currentSince, setCurrentSince] = useState(
        new Date(new Date().getTime() - INITIAL_DATA_DURATION).toISOString(),
    );
    const [isComplete, setIsComplete] = useState(false);
    const { addReports } = useFollowStore();

    // Check if device exists
    const { data: deviceExists } = useSWR(deviceKey ? ["deviceCheck", deviceKey] : null, async () => {
        const exists = await apiService.checkDeviceExists(deviceKey ?? "");
        return exists;
    });

    // Load initial data
    const { data: initialReports } = useSWR(
        deviceKey && deviceExists && !isComplete ? ["initialReports", deviceKey, currentSince] : null,
        async () => {
            const params: ReportParams = {
                limit: REPORT_LIMIT,
                order: "asc",
                since: currentSince,
            };

            return apiService.getReports(deviceKey ?? "", params);
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );

    // Process initial data
    useEffect(() => {
        if (initialReports && initialReports.length > 0) {
            addReports(initialReports);

            if (initialReports.length < REPORT_LIMIT) {
                setIsComplete(true);
            }

            setCurrentSince(initialReports[initialReports.length - 1].timestamp);
        }
    }, [addReports, initialReports]);

    // Real-time polling for new data
    const { data: polledReports } = useSWR(
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
        },
    );

    // Process polled data
    useEffect(() => {
        if (polledReports && polledReports.length > 0) {
            addReports(polledReports);
            setCurrentSince(polledReports[polledReports.length - 1].timestamp);
        }
    }, [addReports, polledReports]);

    return (
        <div className="h-full flex flex-col md:flex-row">
            {/* Sidebar for small screens */}
            <div className="md:hidden">
                <StatusPanel className="m-2" />
            </div>

            {/* Desktop sidebar */}
            <div className="hidden md:block md:w-1/5 lg:w-1/6 p-2">
                <StatusPanel className="h-full" />
            </div>

            {/* Map container */}
            <div className="flex-grow md:w-4/5 lg:w-5/6 h-full">
                <FollowMap />
            </div>
        </div>
    );
}
