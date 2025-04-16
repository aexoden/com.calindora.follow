import { memo } from "react";
import { ColorMode } from "../store/followStore";
import { GRADIENTS, getGradientString } from "../services/color";

interface ColorLegendProps {
    mode: ColorMode;
    className?: string;
    isCompact?: boolean;
}

function ColorLegend({ mode, className = "", isCompact = false }: ColorLegendProps) {
    const { description, min, max } = GRADIENTS[mode];
    const gradient = getGradientString(mode);

    if (isCompact) {
        return (
            <div className={`text-xs ${className}`}>
                <div
                    className="mb-1 h-2 w-full rounded-sm"
                    style={{ background: gradient }}
                />
                <div className="flex justify-between text-gray-500">
                    <span>{min.label}</span>
                    <span>{max.label}</span>
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
                <span>{min.label}</span>
                <span>{max.label}</span>
            </div>
        </div>
    );
}

export default memo(ColorLegend);
