import chroma from "chroma-js";

export interface PointWithColor {
    point: {
        lat: number;
        lng: number;
    };
    color: string;
    id: string;
}

export interface Segment {
    color: string;
    pathEnd: string;
    pathStart: string;
    points: { lat: number; lng: number }[];
}

export function consolidateSegments(points: PointWithColor[], deltaEThreshold: number): Segment[] {
    if (points.length < 2) {
        return points.length === 1
            ? [{ color: points[0].color, pathEnd: points[0].id, pathStart: points[0].id, points: [points[0].point] }]
            : [];
    }

    const initialSegments: Segment[] = [];
    let currentSegment = [points[0]];
    let currentColor = points[0].color;

    const getRepresentativeColor = (segment: PointWithColor[]) => {
        if (segment.length === 1) return segment[0].color;

        const colors = segment.map((p) => chroma(p.color));
        return chroma.average(colors, "oklch").hex();
    };

    // First pass - group by color similiarity
    for (const point of points) {
        const deltaE = chroma.deltaE(currentColor, point.color);

        // Always push the point to the current segment.
        currentSegment.push(point);

        // If the color difference exceeds the threshold, finalize the current segment. The current point needs to both
        // end the current segment and start a new one, because otherwise there would be a gap.
        if (deltaE > deltaEThreshold) {
            const representativeColor = getRepresentativeColor(currentSegment);

            initialSegments.push({
                color: representativeColor,
                pathEnd: currentSegment[currentSegment.length - 1].id,
                pathStart: currentSegment[0].id,
                points: currentSegment.map((p) => p.point),
            });

            currentSegment = [point];
            currentColor = point.color;
        }
    }

    // Add the last segment
    if (currentSegment.length > 0) {
        const representativeColor = getRepresentativeColor(currentSegment);

        initialSegments.push({
            color: representativeColor,
            pathEnd: currentSegment[currentSegment.length - 1].id,
            pathStart: currentSegment[0].id,
            points: currentSegment.map((p) => p.point),
        });
    }

    return initialSegments;
}
