/* eslint-disable sort-keys */
import chroma from "chroma-js";

export type ColorMode = "elevation" | "speed" | "time";

export interface GradientConfig {
    colorSpace: "lab" | "lch" | "oklch" | "hsl" | "rgb";
    colors: chroma.Color[];
    description: string;
    min: {
        value: number;
        label: string;
    };
    max: {
        value: number;
        label: string;
    };
    threshold: number;
}

export const GRADIENTS: Record<ColorMode, GradientConfig> = {
    time: {
        colorSpace: "oklch",
        colors: [chroma.oklch(0.6, 0.25, 260), chroma.oklch(0.6, 0.25, 30)],
        description: "Track colored by time",
        min: {
            value: 0,
            label: "Older",
        },
        max: {
            value: 1,
            label: "Newer",
        },
        threshold: 2.0,
    },
    speed: {
        colorSpace: "oklch",
        colors: [chroma.oklch(0.8, 0.25, 260), chroma.oklch(0.8, 0.25, 145), chroma.oklch(0.8, 0.25, 30)],
        description: "Track colored by speed",
        min: {
            value: 0,
            label: "0 MPH",
        },
        max: {
            value: 44.704, // 100 MPH in m/s
            label: "100+ MPH",
        },
        threshold: 10.0,
    },
    elevation: {
        colorSpace: "oklch",
        colors: [
            chroma.oklch(0.6, 0.25, 260),
            chroma.oklch(0.6, 0.25, 142),
            chroma.oklch(0.48, 0.21, 109),
            chroma.oklch(0.6, 0.21, 53),
            chroma.oklch(0.9, 0.25, 109),
        ],
        description: "Track colored by elevation",
        min: {
            value: -100,
            label: "0 ft",
        },
        max: {
            value: 3048, // 10000 ft in meters
            label: "10000+ ft",
        },
        threshold: 2.0,
    },
};

const colorScales: Record<ColorMode, chroma.Scale> = Object.fromEntries(
    Object.entries(GRADIENTS).map(([mode, config]) => [mode, chroma.scale(config.colors).mode(config.colorSpace)]),
) as Record<ColorMode, chroma.Scale>;

export function getGradientString(mode: ColorMode): string {
    const colorScale = colorScales[mode];

    const stops = [];

    for (let i = 0; i <= 100; i += 20) {
        const color = colorScale(i / 100).css(GRADIENTS[mode].colorSpace);
        stops.push(`${color} ${i.toString()}%`);
    }

    return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function getGradientThreshold(mode: ColorMode): number {
    return GRADIENTS[mode].threshold;
}

export function getColorForValue(mode: ColorMode, value: number): chroma.Color {
    const gradient = GRADIENTS[mode];
    const minValue = gradient.min.value;
    const maxValue = gradient.max.value;

    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));

    return colorScales[mode](normalizedValue);
}

export function getGradientColors(mode: ColorMode, steps: number): string[] {
    return colorScales[mode].colors(steps);
}

export function getCustomScale(mode: ColorMode, domain: [number, number]): chroma.Scale {
    return colorScales[mode].domain(domain);
}
