import { memo, useMemo, useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { useFollowStore, ColorMode, DEFAULT_PRUNE_THRESHOLD } from "../store/followStore";
import { useError, createError } from "../hooks/useError";
import { Switch } from "@headlessui/react";
import {
    MdAccessTime,
    MdChevronRight,
    MdExpandMore,
    MdHeight,
    MdMyLocation,
    MdNearMe,
    MdSpeed,
    MdTimelapse,
    MdTerrain,
    MdInfo,
    MdDeviceHub,
    MdPublic,
} from "react-icons/md";
import ColorLegend from "./ColorLegend";

export interface TimeRangeOption {
    label: string;
    value: number;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
    { label: "2 hours", value: 2 * 60 * 60 * 1000 },
    { label: "6 hours", value: 6 * 60 * 60 * 1000 },
    { label: "12 hours", value: 12 * 60 * 60 * 1000 },
    { label: "1 day", value: 24 * 60 * 60 * 1000 },
    { label: "2 days", value: 2 * 24 * 60 * 60 * 1000 },
    { label: "1 week", value: 7 * 24 * 60 * 60 * 1000 },
];

interface ColorModeButtonProps {
    mode: ColorMode;
    current: ColorMode;
    onChange: (mode: ColorMode) => void;
    icon: React.ReactNode;
    label: string;
    compact?: boolean;
}

function ColorModeButton({ mode, current, onChange, icon, label, compact = false }: ColorModeButtonProps) {
    const isActive = mode === current;

    return (
        <button
            onClick={() => {
                onChange(mode);
            }}
            className={`flex items-center ${compact ? "justify-start" : "justify-center"} rounded-lg p-2 transition-all ${
                isActive
                    ? "bg-slate-600 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
            }`}
        >
            <span className={compact ? "mr-1.5" : "mr-2"}>{icon}</span>
            <span className={`${compact ? "text-xs" : "text-sm"} font-medium`}>{label}</span>
        </button>
    );
}

const MemoizedColorModeButton = memo(ColorModeButton);

interface TimeRangeButtonProps {
    option: TimeRangeOption;
    isSelected: boolean;
    onClick: () => void;
    compact?: boolean;
}

function TimeRangeButton({ option, isSelected, onClick, compact = false }: TimeRangeButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`rounded-lg ${compact ? "px-2 py-0.5" : "px-3 py-1"} text-xs transition-all ${
                isSelected
                    ? "bg-slate-600 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
            }`}
        >
            {option.label}
        </button>
    );
}

const MemoizedTimeRangeButton = memo(TimeRangeButton);

interface StatusPanelProps {
    className?: string;
    isMobile?: boolean;
    deviceKey?: string;
    screenSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export default function StatusPanel({
    className = "",
    isMobile = false,
    deviceKey,
    screenSize = "lg",
}: StatusPanelProps) {
    const {
        lastReport,
        autoCenter,
        setAutoCenter,
        colorMode,
        setColorMode,
        pruneThreshold,
        setPruneThreshold,
        pruneReports,
        loadDeviceSettings,
        saveDeviceSettings,
        removeDeviceSettings,
        hasDeviceSettings,
    } = useFollowStore();

    const [expandedOnMobile, setExpandedOnMobile] = useState(false);
    const [isDeviceSpecific, setIsDeviceSpecific] = useState(false);
    const { addError } = useError();

    const isCompact = !isMobile && screenSize === "md";

    useEffect(() => {
        if (deviceKey) {
            const hasSpecificSettings = hasDeviceSettings(deviceKey);
            setIsDeviceSpecific(hasSpecificSettings);
        } else {
            setIsDeviceSpecific(false);
        }
    }, [deviceKey, hasDeviceSettings]);

    // Find the closest matching time range option to the current prune threshold
    const selectedTimeRangeIndex = useMemo(() => {
        const index = TIME_RANGE_OPTIONS.findIndex((option) => option.value === pruneThreshold);
        return index !== -1
            ? index
            : TIME_RANGE_OPTIONS.findIndex((option) => option.value === DEFAULT_PRUNE_THRESHOLD);
    }, [pruneThreshold]);

    const handleTimeRangeChange = (option: TimeRangeOption) => {
        setPruneThreshold(option.value);

        if (isDeviceSpecific && deviceKey) {
            saveDeviceSettings(deviceKey);
            addError(
                createError(
                    `Device-specific time range: ${option.label}`,
                    "info",
                    "This time range applies only to the current device.",
                ),
            );
        } else {
            addError(
                createError(`Global time range: ${option.label}`, "info", "This time range applies to all devices."),
            );
        }

        pruneReports();
    };

    // Toggle between global and device-specific settings
    const handleSettingsScopeToggle = () => {
        if (!deviceKey) return;

        const newIsDeviceSpecific = !isDeviceSpecific;
        setIsDeviceSpecific(newIsDeviceSpecific);

        if (newIsDeviceSpecific) {
            saveDeviceSettings(deviceKey);
            addError(
                createError(
                    "Using device-specific time range",
                    "info",
                    "Changes to time range will now apply only to this device.",
                ),
            );
        } else {
            removeDeviceSettings(deviceKey);
            addError(
                createError(
                    "Using global time range",
                    "info",
                    "This device will now use the global time range setting.",
                ),
            );
        }
    };

    const formattedValues = useMemo(() => {
        if (!lastReport) return null;

        const timestamp = new Date(lastReport.timestamp);
        const submitTimestamp = lastReport.submit_timestamp ? new Date(lastReport.submit_timestamp) : null;

        const speedMph = Math.round(lastReport.speed * 2.23693629);
        const altitudeFeet = Math.round(lastReport.altitude * 3.280839895);

        const latDirection = lastReport.latitude >= 0 ? "N" : "S";
        const lngDirection = lastReport.longitude >= 0 ? "E" : "W";

        const latFormatted = `${Math.abs(lastReport.latitude).toFixed(4)} ${latDirection}`;
        const lngFormatted = `${Math.abs(lastReport.longitude).toFixed(4)} ${lngDirection}`;

        const bearingFormatted = Math.round(lastReport.bearing);
        const bearingRotation = (bearingFormatted < 45 ? bearingFormatted + 360 : bearingFormatted) - 45;

        const formattedTime = timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const formattedDate = timestamp.toLocaleDateString([], {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        let delayText = "";
        if (submitTimestamp && submitTimestamp.getTime() - timestamp.getTime() > 15000) {
            delayText = `(update delayed ${formatDistance(submitTimestamp, timestamp, { addSuffix: false })})`;
        }

        const bearing = lastReport.bearing;
        const bearingText =
            bearing >= 337.5 || bearing < 22.5
                ? "N"
                : bearing >= 22.5 && bearing < 67.5
                  ? "NE"
                  : bearing >= 67.5 && bearing < 112.5
                    ? "E"
                    : bearing >= 112.5 && bearing < 157.5
                      ? "SE"
                      : bearing >= 157.5 && bearing < 202.5
                        ? "S"
                        : bearing >= 202.5 && bearing < 247.5
                          ? "SW"
                          : bearing >= 247.5 && bearing < 292.5
                            ? "W"
                            : "NW";

        return {
            altitudeFeet,
            bearingFormatted,
            bearingRotation,
            bearingText,
            delayText,
            formattedDate,
            formattedTime,
            latFormatted,
            lngFormatted,
            speedMph,
            submitTimestamp,
            timestamp,
        };
    }, [lastReport]);

    const renderNoDataAlert = () => (
        <div>
            <div>
                <div className="mb-4 rounded-lg bg-amber-50 p-3">
                    <div className="flex items-start">
                        <MdInfo className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-amber-500" />
                        <p className="text-sm text-amber-700">
                            No location data available in the selected time range. Try selecting a longer time range
                            below.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTimeRangeSettings = (compact = false) => (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                    <MdAccessTime className="mr-2 h-5 w-5 text-slate-600" />
                    <span className={`${compact ? "text-sm" : "text-base"} font-medium text-gray-700`}>Time Range</span>
                </div>

                {/* Device-specific settings toggle - only show if deviceKey is provided */}
                {deviceKey && (
                    <div className="flex items-center">
                        {isDeviceSpecific ? (
                            <MdDeviceHub className="mr-1 h-4 w-4 text-blue-600" />
                        ) : (
                            <MdPublic className="mr-1 h-4 w-4 text-gray-500" />
                        )}
                        <span className="mr-2 text-xs text-gray-500">{isDeviceSpecific ? "Device" : "Global"}</span>
                        <Switch
                            checked={isDeviceSpecific}
                            onChange={handleSettingsScopeToggle}
                            className={`${
                                isDeviceSpecific ? "bg-blue-600" : "bg-gray-300"
                            } relative inline-flex h-4 w-8 items-center rounded-full`}
                        >
                            <span
                                className={`${
                                    isDeviceSpecific ? "translate-x-4" : "translate-x-1"
                                } inline-block h-3 w-3 rounded-full bg-white transition-transform`}
                            />
                        </Switch>
                    </div>
                )}
            </div>

            <div className={`grid ${isMobile ? "grid-cols-3" : compact ? "grid-cols-1" : "grid-cols-3"} gap-1.5`}>
                {TIME_RANGE_OPTIONS.map((option, index) => (
                    <MemoizedTimeRangeButton
                        key={option.label}
                        option={option}
                        isSelected={index === selectedTimeRangeIndex}
                        onClick={() => {
                            handleTimeRangeChange(option);
                        }}
                        compact={compact}
                    />
                ))}
            </div>
        </div>
    );

    const renderColorModeSettings = (compact = false) => (
        <div>
            <div className="mb-2 flex items-center">
                <span className={`${compact ? "text-sm" : "text-base"} font-medium text-gray-700`}>Track Coloring</span>
            </div>
            <div className={`grid ${compact && !isMobile ? "grid-cols-1" : "grid-cols-3"} gap-1.5`}>
                <MemoizedColorModeButton
                    mode="time"
                    current={colorMode}
                    onChange={setColorMode}
                    icon={<MdTimelapse className={compact ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Time"
                    compact={compact}
                />
                <MemoizedColorModeButton
                    mode="speed"
                    current={colorMode}
                    onChange={setColorMode}
                    icon={<MdSpeed className={compact ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Speed"
                    compact={compact}
                />
                <MemoizedColorModeButton
                    mode="elevation"
                    current={colorMode}
                    onChange={setColorMode}
                    icon={<MdTerrain className={compact ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Elevation"
                    compact={compact}
                />
            </div>
            <div className="mt-3">
                <ColorLegend
                    mode={colorMode}
                    compact={compact}
                />
            </div>
        </div>
    );

    const renderAutoCenterToggle = (compact = false) => (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <span className={`${compact ? "text-sm" : "text-base"} font-medium text-gray-700`}>
                    Auto-Center Map
                </span>
                <Switch
                    checked={autoCenter}
                    onChange={setAutoCenter}
                    className={`${
                        autoCenter ? "bg-slate-600" : "bg-gray-300"
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none`}
                >
                    <span
                        className={`${autoCenter ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                </Switch>
            </div>
        </div>
    );

    const renderSettings = (compact = false) => (
        <div className="space-y-4">
            {renderAutoCenterToggle(compact)}
            {renderTimeRangeSettings(compact)}
            {renderColorModeSettings(compact)}
        </div>
    );

    const renderMobileLocationMetrics = () => {
        if (!formattedValues) return null;

        return (
            <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="flex justify-center text-slate-500">
                        <MdHeight className="h-4 w-4" />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-700">{formattedValues.altitudeFeet}</div>
                    <div className="text-xs text-gray-500">FT</div>{" "}
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="flex justify-center text-slate-500">
                        <MdNearMe className="h-4 w-4" />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-700">{formattedValues.bearingText}</div>
                    <div className="text-xs text-gray-500">{formattedValues.bearingFormatted}°</div>
                </div>

                <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <div className="flex justify-center text-slate-500">
                        <MdMyLocation className="h-4 w-4" />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-700">{formattedValues.latFormatted}</div>
                    <div className="text-xs text-gray-500">{formattedValues.lngFormatted}</div>
                </div>
            </div>
        );
    };

    // Mobile view
    if (isMobile) {
        return (
            <div className={`rounded-lg bg-white shadow-md transition-all ${className}`}>
                <div
                    className="flex cursor-pointer items-center p-3"
                    onClick={() => {
                        setExpandedOnMobile(!expandedOnMobile);
                    }}
                >
                    {/* Main info section - visible when collapsed */}
                    <div className="flex items-center">
                        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                            {formattedValues ? (
                                <MdMyLocation className="h-5 w-5 text-slate-600" />
                            ) : (
                                <MdInfo className="h-5 w-5 text-amber-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-l font-medium text-slate-800">
                                {formattedValues ? "Current Location" : "No Location Data"}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {formattedValues ? formattedValues.formattedTime : "Adjust time range"}
                            </p>
                        </div>
                    </div>

                    {/* Middle section - compass */}
                    {formattedValues && (
                        <div className="flex flex-1 flex-col items-center">
                            <div className="text-2xl">
                                <MdNearMe
                                    className="text-slate-500"
                                    style={{
                                        transform: `rotate(${formattedValues.bearingRotation.toString()}deg)`,
                                    }}
                                />
                            </div>
                            <div className="text-sm font-medium text-slate-600">{formattedValues.bearingText}</div>
                        </div>
                    )}

                    {/* Right section - speed and altitude */}
                    {formattedValues && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-baseline">
                                <span className="text-l font-semibold text-slate-700">{formattedValues.speedMph}</span>
                                <span className="ml-1 text-xs text-gray-500">MPH</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="text-sm font-medium text-slate-600">
                                    {formattedValues.altitudeFeet}
                                </span>
                                <span className="ml-1 text-xs text-gray-500">FT</span>
                            </div>
                        </div>
                    )}

                    {/* Expand/Collapse control */}
                    <div className={`${formattedValues ? "ml-2" : "ml-auto"} flex flex-col items-end`}>
                        {expandedOnMobile ? (
                            <MdExpandMore className="mt-1 h-5 w-5 text-gray-500" />
                        ) : (
                            <MdChevronRight className="mt-1 h-5 w-5 text-gray-500" />
                        )}
                    </div>
                </div>

                <div
                    className={`overflow-hidden transition-all duration-300 ${
                        expandedOnMobile ? "max-h-96" : "max-h-0"
                    }`}
                >
                    <div className="border-t border-gray-100 p-3">
                        {/* Show location metrics if we have data */}
                        {formattedValues && renderMobileLocationMetrics()}

                        {/* Settings section */}
                        {renderSettings(true)}
                    </div>
                </div>
            </div>
        );
    }

    // Desktop view with no data
    if (!formattedValues) {
        return (
            <div className={`rounded-lg bg-white p-4 shadow-md ${className}`}>
                <h1 className="mb-4 text-xl font-bold text-slate-700">Calindora Follow</h1>
                {renderNoDataAlert()}
                {renderSettings(isCompact)}
            </div>
        );
    }

    // Desktop view with data
    return (
        <div className={`rounded-lg bg-white p-4 shadow-md ${className}`}>
            <div className={`mb-4 flex items-center ${isCompact ? "space-x-2" : "space-x-3"}`}>
                <div
                    className={`flex ${isCompact ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded-full bg-slate-600 text-white`}
                >
                    <MdMyLocation className="h-6 w-6" />
                </div>
                <div>
                    <h1 className={`${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-700`}>
                        Calindora Follow
                    </h1>
                    <p className="text-sm text-gray-500">Live location tracking</p>
                </div>
            </div>

            <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <div className="mb-1 text-sm font-medium text-gray-500">LAST UPDATE</div>
                <div className="flex items-baseline justify-between">
                    <div className={`${isCompact ? "text-lg" : "text-xl"} font-semibold text-slate-800`}>
                        {formattedValues.formattedTime}
                    </div>
                    <div className="text-sm text-gray-500">{formattedValues.formattedDate}</div>
                </div>
                {formattedValues.delayText && (
                    <div className="mt-1 text-sm text-amber-600">{formattedValues.delayText}</div>
                )}
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-100 bg-white p-2 text-center shadow-sm">
                    <MdSpeed className="mx-auto h-5 w-5 text-slate-500" />
                    <div className={`mt-1 ${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-700`}>
                        {formattedValues.speedMph}
                    </div>
                    <div className="text-xs text-gray-500">MPH</div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-white p-2 text-center shadow-sm">
                    <MdHeight className="mx-auto h-5 w-5 text-slate-500" />
                    <div className={`mt-1 ${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-700`}>
                        {formattedValues.altitudeFeet}
                    </div>
                    <div className="text-xs text-gray-500">FT</div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-white p-2 text-center shadow-sm">
                    <MdNearMe
                        className="mx-auto h-5 w-5 text-slate-500"
                        style={{ transform: `rotate(${formattedValues.bearingRotation.toString()}deg)` }}
                    />
                    <div className={`mt-1 ${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-700`}>
                        {formattedValues.bearingText}
                    </div>
                    <div className="text-xs text-gray-500">{formattedValues.bearingFormatted}°</div>
                </div>
            </div>

            <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <div className="mb-1 text-sm font-medium text-gray-500">COORDINATES</div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <div className="text-xs text-gray-500">LATITUDE</div>
                        <div className={`${isCompact ? "text-base" : "text-lg"} font-medium text-slate-700`}>
                            {formattedValues.latFormatted}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">LONGITUDE</div>
                        <div className={`${isCompact ? "text-base" : "text-lg"} font-medium text-slate-700`}>
                            {formattedValues.lngFormatted}
                        </div>
                    </div>
                </div>
            </div>

            {renderSettings(isCompact)}
        </div>
    );
}
