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
import { getColorForValue } from "../services/color";
import { PointWithColor, consolidateSegments } from "../util/path";

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

            const DELTA_E_THRESHOLD = 10.0;

            const pointsWithColors: PointWithColor[] = reports.map((report) => {
                let color: string;

                switch (colorMode) {
                    case "time": {
                        const reportTime = new Date(report.timestamp).getTime();
                        const ageRatio = Math.max(0, Math.min(1, (now - reportTime) / pruneThreshold));
                        color = getColorForValue("time", 1 - ageRatio).hex();
                        break;
                    }

                    case "speed": {
                        color = getColorForValue("speed", report.speed).hex();
                        break;
                    }

                    case "elevation": {
                        color = getColorForValue("elevation", report.altitude).hex();
                        break;
                    }
                }

                return {
                    color,
                    id: report.id,
                    point: {
                        lat: report.latitude,
                        lng: report.longitude,
                    },
                };
            });

            return consolidateSegments(pointsWithColors, DELTA_E_THRESHOLD);
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
                            path={path.points}
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
