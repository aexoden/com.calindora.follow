import { memo, useMemo, useState } from "react";
import { formatDistance } from "date-fns";
import { useFollowStore, ColorMode, DEFAULT_PRUNE_THRESHOLD } from "../store/followStore";
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
}

function ColorModeButton({ mode, current, onChange, icon, label }: ColorModeButtonProps) {
    const isActive = mode === current;

    return (
        <button
            onClick={() => {
                onChange(mode);
            }}
            className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                isActive
                    ? "bg-slate-600 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
            }`}
        >
            <span className="mr-2">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

const MemoizedColorModeButton = memo(ColorModeButton);

interface TimeRangeButtonProps {
    option: TimeRangeOption;
    isSelected: boolean;
    onClick: () => void;
}

function TimeRangeButton({ option, isSelected, onClick }: TimeRangeButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`rounded-lg px-3 py-1 text-xs transition-all ${
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
}

export default function StatusPanel({ className = "", isMobile = false }: StatusPanelProps) {
    const { lastReport, autoCenter, setAutoCenter, colorMode, setColorMode, pruneThreshold, setPruneThreshold } =
        useFollowStore();
    const [expandedOnMobile, setExpandedOnMobile] = useState(false);

    // Find the closest matching time range option to the current prune threshold
    const selectedTimeRangeIndex = useMemo(() => {
        const index = TIME_RANGE_OPTIONS.findIndex((option) => option.value === pruneThreshold);
        return index !== -1
            ? index
            : TIME_RANGE_OPTIONS.findIndex((option) => option.value === DEFAULT_PRUNE_THRESHOLD);
    }, [pruneThreshold]);

    const handleTimeRangeChange = (option: TimeRangeOption) => {
        setPruneThreshold(option.value);
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

    // This is just to satisfy TypeScript, since it apparently can't infer that
    // formattedValues is only null if lastReport is null.
    if (!lastReport || !formattedValues) {
        return (
            <div className={`rounded-lg bg-white p-4 shadow-md ${className}`}>
                <h1 className="mb-4 text-xl font-bold text-slate-700">Calindora Follow</h1>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-pluse flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                        <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                        <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                    </div>
                </div>
                <p className="text-gray-600">Waiting for location data...</p>
            </div>
        );
    }

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
                            <MdMyLocation className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-l font-medium text-slate-800">Current Location</h2>
                            <p className="text-sm text-gray-500">{formattedValues.formattedTime}</p>
                        </div>
                    </div>

                    {/* Middle section - compass */}
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

                    {/* Right section - speed and altitude */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-baseline">
                            <span className="text-l font-semibold text-slate-700">{formattedValues.speedMph}</span>
                            <span className="ml-1 text-xs text-gray-500">MPH</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="text-sm font-medium text-slate-600">{formattedValues.altitudeFeet}</span>
                            <span className="ml-1 text-xs text-gray-500">FT</span>
                        </div>
                    </div>
                    <div className="ml-2 flex flex-col items-end">
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
                        <div className="mb-4 grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-slate-50 p-2 text-center">
                                <div className="flex justify-center text-slate-500">
                                    <MdHeight className="h-4 w-4" />
                                </div>
                                <div className="mt-1 text-lg font-semibold text-slate-700">
                                    {formattedValues.altitudeFeet}
                                </div>
                                <div className="text-xs text-gray-500">FT</div>{" "}
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2 text-center">
                                <div className="flex justify-center text-slate-500">
                                    <MdNearMe className="h-4 w-4" />
                                </div>
                                <div className="mt-1 text-lg font-semibold text-slate-700">
                                    {formattedValues.bearingText}
                                </div>
                                <div className="text-xs text-gray-500">{formattedValues.bearingFormatted}°</div>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2 text-center">
                                <div className="flex justify-center text-slate-500">
                                    <MdMyLocation className="h-4 w-4" />
                                </div>
                                <div className="mt-1 text-lg font-semibold text-slate-700">
                                    {formattedValues.latFormatted}
                                </div>
                                <div className="text-xs text-gray-500">{formattedValues.lngFormatted}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Auto-Center Map</span>
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

                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-600">Time Range:</div>
                                <div className="flex flex-wrap gap-1">
                                    {TIME_RANGE_OPTIONS.map((option, index) => (
                                        <MemoizedTimeRangeButton
                                            key={option.label}
                                            option={option}
                                            isSelected={index === selectedTimeRangeIndex}
                                            onClick={() => {
                                                handleTimeRangeChange(option);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-600">Track Coloring:</div>
                                <div className="grid grid-cols-3 gap-1">
                                    <MemoizedColorModeButton
                                        mode="time"
                                        current={colorMode}
                                        onChange={setColorMode}
                                        icon={<MdTimelapse className="h-4 w-4" />}
                                        label="Time"
                                    />
                                    <MemoizedColorModeButton
                                        mode="speed"
                                        current={colorMode}
                                        onChange={setColorMode}
                                        icon={<MdSpeed className="h-4 w-4" />}
                                        label="Speed"
                                    />
                                    <MemoizedColorModeButton
                                        mode="elevation"
                                        current={colorMode}
                                        onChange={setColorMode}
                                        icon={<MdTerrain className="h-4 w-4" />}
                                        label="Elevation"
                                    />
                                </div>
                                <div className="mt-2">
                                    <ColorLegend
                                        mode={colorMode}
                                        compact={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-lg bg-white p-5 shadow-md ${className}`}>
            <div className="mb-6 flex items-center">
                <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white">
                    <MdMyLocation className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-700">Calindora Follow</h1>
                    <p className="text-sm text-gray-500">Live location tracking</p>
                </div>
            </div>

            <div className="mb-6 rounded-lg bg-slate-50 p-4">
                <div className="mb-1 text-sm font-medium text-gray-500">LAST UPDATE</div>
                <div className="flex items-baseline justify-between">
                    <div className="text-xl font-semibold text-slate-800">{formattedValues.formattedTime}</div>
                    <div className="text-sm text-gray-500">{formattedValues.formattedDate}</div>
                </div>
                {formattedValues.delayText && (
                    <div className="mt-1 text-sm text-amber-600">{formattedValues.delayText}</div>
                )}
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-100 bg-white p-3 text-center shadow-sm">
                    <MdSpeed className="mx-auto h-5 w-5 text-slate-500" />
                    <div className="mt-2 text-2xl font-bold text-slate-700">{formattedValues.speedMph}</div>
                    <div className="text-xs text-gray-500">MPH</div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-white p-3 text-center shadow-sm">
                    <MdHeight className="mx-auto h-5 w-5 text-slate-500" />
                    <div className="mt-2 text-2xl font-bold text-slate-700">{formattedValues.altitudeFeet}</div>
                    <div className="text-xs text-gray-500">FT</div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-white p-3 text-center shadow-sm">
                    <MdNearMe
                        className="mx-auto h-5 w-5 text-slate-500"
                        style={{ transform: `rotate(${formattedValues.bearingRotation.toString()}deg)` }}
                    />
                    <div className="mt-2 text-2xl font-bold text-slate-700">{formattedValues.bearingText}</div>
                    <div className="text-xs text-gray-500">{formattedValues.bearingFormatted}°</div>
                </div>
            </div>

            <div className="mb-6 rounded-lg bg-slate-50 p-4">
                <div className="mb-2 text-sm font-medium text-gray-500">COORDINATES</div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">LATITUDE</div>
                        <div className="text-lg font-medium text-slate-700">{formattedValues.latFormatted}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">LONGITUDE</div>
                        <div className="text-lg font-medium text-slate-700">{formattedValues.lngFormatted}</div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-gray-700">Auto-Center Map</span>
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

                <div>
                    <div className="mb-3 flex items-center">
                        <MdAccessTime className="mr-2 h-5 w-5 text-slate-600" />
                        <span className="font-medium text-gray-700">Time Range</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {TIME_RANGE_OPTIONS.map((option, index) => (
                            <MemoizedTimeRangeButton
                                key={option.label}
                                option={option}
                                isSelected={index === selectedTimeRangeIndex}
                                onClick={() => {
                                    handleTimeRangeChange(option);
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="mb-3 block font-medium text-gray-700">Track Coloring</label>
                    <div className="grid grid-cols-1 gap-2">
                        <MemoizedColorModeButton
                            mode="time"
                            current={colorMode}
                            onChange={setColorMode}
                            icon={<MdTimelapse className="h-5 w-5" />}
                            label="Time"
                        />
                        <MemoizedColorModeButton
                            mode="speed"
                            current={colorMode}
                            onChange={setColorMode}
                            icon={<MdSpeed className="h-5 w-5" />}
                            label="Speed"
                        />
                        <MemoizedColorModeButton
                            mode="elevation"
                            current={colorMode}
                            onChange={setColorMode}
                            icon={<MdTerrain className="h-5 w-5" />}
                            label="Elevation"
                        />
                    </div>

                    <div className="mt-4">
                        <ColorLegend mode={colorMode} />
                    </div>
                </div>
            </div>
        </div>
    );
}
