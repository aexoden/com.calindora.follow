import chroma from "chroma-js";

export interface PointWithColor {
    point: {
        lat: number;
        lng: number;
    };
    color: string;
    id: string;
    timestamp: number;
}

export interface Segment {
    color: string;
    pathEnd: string;
    pathStart: string;
    points: { lat: number; lng: number }[];
    zIndex: number;
}

export function consolidateSegments(points: PointWithColor[], deltaEThreshold: number): Segment[] {
    const first = points[0];

    if (!first || points.length < 2) {
        return first
            ? [
                  {
                      color: first.color,
                      pathEnd: first.id,
                      pathStart: first.id,
                      points: [first.point],
                      zIndex: first.timestamp,
                  },
              ]
            : [];
    }

    const initialSegments: Segment[] = [];
    let currentSegment: PointWithColor[] = [first];
    let currentColor = first.color;

    const getRepresentativeColor = (segment: PointWithColor[]) => {
        const segFirst = segment[0];
        if (!segFirst) return "#000000";
        if (segment.length === 1) return segFirst.color;

        const colors = segment.map((p) => chroma(p.color));
        return chroma.average(colors, "lab").hex();
    };

    const pushSegment = (segment: PointWithColor[]) => {
        const start = segment[0];
        const end = segment[segment.length - 1];
        if (!start || !end) return;

        initialSegments.push({
            color: getRepresentativeColor(segment),
            pathEnd: end.id,
            pathStart: start.id,
            points: segment.map((p) => p.point),
            zIndex: end.timestamp,
        });
    };

    // First pass - group by color similiarity
    for (const point of points) {
        const deltaE = chroma.deltaE(currentColor, point.color);

        // Always push the point to the current segment.
        currentSegment.push(point);

        // If the color difference exceeds the threshold, finalize the current segment. The current point needs to both
        // end the current segment and start a new one, because otherwise there would be a gap.
        if (deltaE > deltaEThreshold) {
            pushSegment(currentSegment);

            currentSegment = [point];
            currentColor = point.color;
        }
    }

    // Add the last segment
    if (currentSegment.length > 0) {
        pushSegment(currentSegment);
    }

    return initialSegments;
}
