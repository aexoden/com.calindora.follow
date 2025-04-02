import { memo, useEffect, useMemo, useState, useCallback } from "react";
import {
    GoogleMap,
    useJsApiLoader,
    MarkerF as Marker,
    CircleF as Circle,
    PolylineF as Polyline,
} from "@react-google-maps/api";
import { useFollowStore } from "../store/followStore";
import { Report } from "../services/api";

const containerStyle = {
    height: "100%",
    width: "100%",
};

interface FollowMapProps {
    className?: string;
}

function FollowMap({ className = "" }: FollowMapProps) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        id: "google-map-script",
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const { trips, lastReport, autoCenter, colorMode } = useFollowStore();

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    useEffect(() => {
        if (!map || !lastReport || !autoCenter) return;

        const lat = lastReport.latitude;
        const lng = lastReport.longitude;

        map.panTo({ lat, lng });
    }, [map, lastReport, autoCenter]);

    const getPathStyles = useCallback(
        (trip: { reports: Report[] }) => {
            const reports = trip.reports;
            if (reports.length < 2) return [];

            const now = new Date().getTime();

            const paths = [];
            let currentPath = [];
            let currentColor = "#0066CC"; // Default color
            let pathStart = reports[0].id;
            let pathEnd = reports[0].id;

            for (const report of reports) {
                let color = "#0066CC"; // Default color

                switch (colorMode) {
                    case "time": {
                        // Color gradients from blue (oldest) to red (newest)
                        const reportTime = new Date(report.timestamp).getTime();
                        const ageRatio = Math.max(0, Math.min(1, (now - reportTime) / (86400 * 1000)));

                        // Hue: 210 (blue) to 0 (red)
                        const hue = 360 - ageRatio * 120;
                        color = `hsl(${Math.round(hue).toString()}, 100%, 50%)`;
                        break;
                    }

                    case "speed": {
                        // Color based on speed: blue (slow) to red (fast)
                        const speedRatio = Math.max(0, Math.min(1, report.speed / 40));

                        const hue = 210 - speedRatio * 210;
                        color = `hsl(${Math.round(hue).toString()}, 100%, 50%)`;
                        break;
                    }

                    case "elevation": {
                        // Color based on elevation: blue (low) to red (high)
                        const altitudeRatio = Math.max(0, Math.min(1, report.altitude / 3048));

                        const hue = 210 - altitudeRatio * 210;
                        color = `hsl(${Math.round(hue).toString()}, 100%, 50%)`;
                        break;
                    }
                }

                const point = {
                    lat: report.latitude,
                    lng: report.longitude,
                };

                if (currentColor !== color) {
                    if (currentPath.length > 0) {
                        currentPath.push(point);
                        pathEnd = report.id;
                        paths.push({ color: currentColor, path: currentPath, pathEnd, pathStart });
                    }
                    currentPath = [];
                    pathStart = report.id;
                    currentColor = color;
                }

                currentPath.push(point);
            }

            if (currentPath.length > 0) {
                pathEnd = reports[reports.length - 1].id;
                paths.push({ color: currentColor, path: currentPath, pathEnd, pathStart });
            }

            return paths;
        },
        [colorMode],
    );

    // Memoize path styles
    // TODO: It would be nice to memoize each trip individually, but it may be moot if we switch to maintaining the
    // polylines manually.
    const allPathStyles = useMemo(() => {
        return trips.map((trip) => {
            if (trip.reports.length === 0) return [];
            return getPathStyles(trip);
        });
    }, [trips, getPathStyles]);

    if (!isLoaded) return <div className="flex h-full items-center justify-center">Loading Maps...</div>;

    return (
        <div className={`h-full ${className}`}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                zoom={16}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{ fullscreenControl: false, mapTypeControl: true, streetViewControl: false }}
            >
                {lastReport && (
                    <>
                        <Marker position={{ lat: lastReport.latitude, lng: lastReport.longitude }} />
                        <Circle
                            center={{ lat: lastReport.latitude, lng: lastReport.longitude }}
                            options={{
                                fillColor: "#0066CC",
                                fillOpacity: 0.3,
                                radius: lastReport.accuracy,
                                strokeColor: "#0066CC",
                                strokeOpacity: 0.9,
                                strokeWeight: 2,
                            }}
                        />
                    </>
                )}

                {trips.map((trip, tripIndex) => {
                    if (trip.reports.length === 0) return null;

                    const pathStyles = allPathStyles[tripIndex];

                    return pathStyles.map((path) => (
                        <Polyline
                            key={`${path.pathStart}-${path.pathEnd}`}
                            path={path.path}
                            options={{
                                strokeColor: path.color,
                                strokeOpacity: 1.0,
                                strokeWeight: 4,
                            }}
                        />
                    ));
                })}
            </GoogleMap>
        </div>
    );
}

export default memo(FollowMap);
