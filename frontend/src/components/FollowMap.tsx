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
import { useToast } from "../hooks/useToast";

const containerStyle = {
    height: "100%",
    width: "100%",
};

interface FollowMapProps {
    className?: string;
}

interface Color {
    r: number;
    g: number;
    b: number;
}

function colorFromHex(hex: string): Color {
    const bigint = parseInt(hex.slice(1), 16);

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return { b, g, r };
}

function interpolateColor(start: Color, end: Color, factor: number): Color {
    const r = Math.round(start.r + factor * (end.r - start.r));
    const g = Math.round(start.g + factor * (end.g - start.g));
    const b = Math.round(start.b + factor * (end.b - start.b));

    return { b, g, r };
}

function FollowMap({ className = "" }: FollowMapProps) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        id: "google-map-script",
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const toast = useToast();

    const { trips, lastReport, autoCenter, colorMode, pruneThreshold, mapSettings, setMapSettings, setAutoCenter } =
        useFollowStore();

    const saveMapState = useCallback(() => {
        if (!map || !initialLoadDone) return;

        const center = map.getCenter();
        const zoom = map.getZoom();

        if (center && zoom !== undefined) {
            setMapSettings({
                center: autoCenter ? null : { lat: center.lat(), lng: center.lng() },
                zoom: zoom,
            });
        }
    }, [map, initialLoadDone, autoCenter, setMapSettings]);

    useEffect(() => {
        if (!map || !initialLoadDone) return;

        let timeoutId: number | undefined;

        const handleMapChanged = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            timeoutId = window.setTimeout(saveMapState, 500);
        };

        // Listen for map changes
        const zoomListener = map.addListener("zoom_changed", handleMapChanged);
        const centerListener = map.addListener("center_changed", handleMapChanged);

        return () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            google.maps.event.removeListener(zoomListener);
            google.maps.event.removeListener(centerListener);
        };
    }, [map, initialLoadDone, saveMapState]);

    useEffect(() => {
        if (!map || !initialLoadDone || !autoCenter) return;

        let isDragging = false;

        const handleDragStart = () => {
            isDragging = true;
        };

        const handleDragEnd = () => {
            if (isDragging) {
                setAutoCenter(false);
                isDragging = false;

                toast.info("Auto-center disabled", "Auto-center has been turned off because you moved the map");
            }
        };

        const dragStartListener = map.addListener("dragstart", handleDragStart);
        const dragEndListener = map.addListener("dragend", handleDragEnd);

        return () => {
            google.maps.event.removeListener(dragStartListener);
            google.maps.event.removeListener(dragEndListener);
        };
    }, [map, initialLoadDone, autoCenter, setAutoCenter, toast]);

    const onLoad = useCallback(
        (map: google.maps.Map) => {
            // Apply saved settings to map
            if (mapSettings.center) {
                map.setCenter(mapSettings.center);
            } else if (lastReport) {
                map.setCenter({ lat: lastReport.latitude, lng: lastReport.longitude });
            }

            if (mapSettings.zoom) {
                map.setZoom(mapSettings.zoom);
            }

            setMap(map);

            // Mark initial load as complete after a small delay to prevent initial settings from being saved immediately.
            setTimeout(() => {
                setInitialLoadDone(true);
            }, 500);
        },
        [mapSettings, lastReport],
    );

    const onUnmount = useCallback(() => {
        setMap(null);
        setInitialLoadDone(false);
    }, []);

    // Handle auto-centering
    useEffect(() => {
        if (!map || !lastReport || !autoCenter || !initialLoadDone) return;

        const lat = lastReport.latitude;
        const lng = lastReport.longitude;

        map.panTo({ lat, lng });
    }, [map, lastReport, autoCenter, initialLoadDone]);

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
                        // Color gradient: #0066CC (oldest) to #9966CC (middle) to #FF6666 (red)
                        const reportTime = new Date(report.timestamp).getTime();
                        const ageRatio = Math.max(0, Math.min(1, (now - reportTime) / pruneThreshold));

                        if (ageRatio < 0.5) {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#FF6666"),
                                colorFromHex("#996699"),
                                ageRatio * 2,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        } else {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#996699"),
                                colorFromHex("#0066CC"),
                                (ageRatio - 0.5) * 2,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        }

                        break;
                    }

                    case "speed": {
                        // Color gardient: #0066CC (0MPH) to #32AF42 (50MPH) to (#FFCC33 (100MPH)
                        const speedRatio = Math.max(0, Math.min(1, report.speed / 44.704)); // 100MPH = 44.704 m/s

                        if (speedRatio < 1.0) {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#0066CC"),
                                colorFromHex("#32AF42"),
                                speedRatio,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        } else {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#32AF42"),
                                colorFromHex("#FFCC33"),
                                (speedRatio - 0.5) * 2,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        }

                        break;
                    }

                    case "elevation": {
                        // Color gardient: #0F5E9C (0ft) to #0B7039 (5000ft) to #925E1C (10000ft)",
                        const altitudeRatio = Math.max(0, Math.min(1, report.altitude / 3048.0)); // 10000ft = 3048m

                        if (altitudeRatio < 1.0) {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#0F5E9C"),
                                colorFromHex("#0B7039"),
                                altitudeRatio,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        } else {
                            const interpolatedColor = interpolateColor(
                                colorFromHex("#0B7039"),
                                colorFromHex("#925E1C"),
                                (altitudeRatio - 0.5) * 2,
                            );

                            color = `rgb(${interpolatedColor.r.toString()}, ${interpolatedColor.g.toString()}, ${interpolatedColor.b.toString()})`;
                        }

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
        [colorMode, pruneThreshold],
    );

    // Memoize path styles
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
                zoom={mapSettings.zoom}
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
