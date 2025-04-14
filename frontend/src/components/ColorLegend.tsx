import { memo } from "react";
import { ColorMode } from "../store/followStore";

interface ColorLegendProps {
    mode: ColorMode;
    className?: string;
    isCompact?: boolean;
}

function ColorLegend({ mode, className = "", isCompact = false }: ColorLegendProps) {
    const config = {
        elevation: {
            description: "Track colored by elevation",
            gradient: "linear-gradient(to right, #0F5E9C, #0B7039, #925E1C)",
            labels: ["0 ft", "10000+ ft"],
        },
        speed: {
            description: "Track colored by speed",
            gradient: "linear-gradient(to right, #0066CC, #32AF42, #FFCC33)",
            labels: ["0 MPH", "100+ MPH"],
        },
        time: {
            description: "Track colored by time",
            gradient: "linear-gradient(to right, #0066CC, #996699, #FF6666)",
            labels: ["Older", "Newer"],
        },
    };

    const { gradient, labels, description } = config[mode];

    if (isCompact) {
        return (
            <div className={`text-xs ${className}`}>
                <div
                    className="mb-1 h-2 w-full rounded-sm"
                    style={{ background: gradient }}
                />
                <div className="flex justify-between text-gray-500">
                    <span>{labels[0]}</span>
                    <span>{labels[1]}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="mb-1 text-sm text-gray-600">{description}</div>
            <div
                className="mb-1 h-3 w-full rounded-md"
                style={{ background: gradient }}
            />
            <div className="flex justify-between text-xs text-gray-500">
                <span>{labels[0]}</span>
                <span>{labels[1]}</span>
            </div>
        </div>
    );
}

export default memo(ColorLegend);
