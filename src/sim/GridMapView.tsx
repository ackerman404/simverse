import React, { useMemo } from "react";
import type { RobotPose } from "../lib/programTypes";
import type { Obstacle } from "./sensors";

export type Vec2 = { x: number; y: number };

export type Beacon = {
    center: Vec2;
    radius: number;
    label?: string;
    labelOffset?: Vec2;
    textAnchor?: "start" | "middle" | "end";
};

export type SensorRay = {
    from: Vec2;
    to: Vec2;
};

export type StepMarker = {
    position: Vec2;
    index: number;
};

export type GridBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

export interface GridMapViewProps {
    bounds: GridBounds;
    path?: Vec2[];
    previousPath?: Vec2[];
    beacons?: Beacon[];
    obstacles?: Obstacle[];
    roverPose?: RobotPose;
    sensorRays?: SensorRay[];
    stepMarkers?: StepMarker[];
    className?: string;
    title?: string;
    showAxes?: boolean;
}

export function GridMapView({
    bounds,
    path,
    previousPath,
    beacons,
    obstacles,
    roverPose,
    sensorRays,
    stepMarkers,
    className = "",
    title,
    showAxes = false,
}: GridMapViewProps) {
    // --- Coordinate System ---
    // World: X right, Y up
    // SVG: X right, Y down
    // We need to flip Y.

    const margin = 1.0; // meters margin around bounds
    const viewMinX = bounds.minX - margin;
    const viewMaxX = bounds.maxX + margin;
    const viewMinY = bounds.minY - margin;
    const viewMaxY = bounds.maxY + margin;

    const width = viewMaxX - viewMinX;
    const height = viewMaxY - viewMinY;

    // SVG viewBox: min-x min-y width height
    // But since SVG Y is down, we need to be careful.
    // Let's map world coordinates to SVG coordinates directly in the elements.
    // SVG coordinate system: (0,0) top-left.
    // We'll set viewBox such that it covers the world bounds, but flipped Y?
    // No, standard SVG transforms are easier.
    // Let's use a group with transform to handle the flip.

    // ViewBox logic:
    // We want the SVG to cover [viewMinX, viewMaxX] horizontally.
    // And [viewMinY, viewMaxY] vertically.
    // Since SVG Y is down, let's say the SVG height corresponds to world height.
    // We can use a scale(1, -1) to flip Y, but then text is upside down.
    // Better to just manually map Y.

    const mapX = (x: number) => x;
    const mapY = (y: number) => -y; // Flip Y

    // The viewBox needs to be in the mapped space.
    // mapped bounds:
    // X: [viewMinX, viewMaxX]
    // Y: [-viewMaxY, -viewMinY] (since viewMaxY > viewMinY, -viewMaxY < -viewMinY)

    const vbMinX = viewMinX;
    const vbMinY = -viewMaxY;
    const vbWidth = width;
    const vbHeight = height;

    const viewBox = `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`;

    // Grid lines
    const gridLines = useMemo(() => {
        const lines = [];
        const startX = Math.floor(viewMinX);
        const endX = Math.ceil(viewMaxX);
        const startY = Math.floor(viewMinY);
        const endY = Math.ceil(viewMaxY);

        for (let x = startX; x <= endX; x++) {
            lines.push({
                x1: x, y1: viewMinY, x2: x, y2: viewMaxY,
                isAxis: x === 0
            });
        }
        for (let y = startY; y <= endY; y++) {
            lines.push({
                x1: viewMinX, y1: y, x2: viewMaxX, y2: y,
                isAxis: y === 0
            });
        }
        return lines;
    }, [viewMinX, viewMaxX, viewMinY, viewMaxY]);

    // Ticks
    const ticks = useMemo(() => {
        if (!showAxes) return { x: [], y: [] };
        const xTicks = [];
        const yTicks = [];
        const startX = Math.ceil(viewMinX);
        const endX = Math.floor(viewMaxX);
        const startY = Math.ceil(viewMinY);
        const endY = Math.floor(viewMaxY);

        for (let x = startX; x <= endX; x++) {
            xTicks.push(x);
        }
        for (let y = startY; y <= endY; y++) {
            yTicks.push(y);
        }
        return { x: xTicks, y: yTicks };
    }, [showAxes, viewMinX, viewMaxX, viewMinY, viewMaxY]);

    // Path string builder
    const makePolyline = (pts: Vec2[]) => {
        return pts.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(" ");
    };

    return (
        <div className={`relative bg-slate-900 rounded border border-slate-700 overflow-hidden ${className}`}>
            {title && (
                <div className="absolute top-2 left-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded z-10 pointer-events-none">
                    {title}
                </div>
            )}

            <svg
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full block"
                style={{ vectorEffect: "non-scaling-stroke" }} // Helps keep strokes consistent if we scale
            >
                {/* Grid */}
                <g className="grid-layer">
                    {gridLines.map((line, i) => (
                        <line
                            key={i}
                            x1={mapX(line.x1)}
                            y1={mapY(line.y1)}
                            x2={mapX(line.x2)}
                            y2={mapY(line.y2)}
                            stroke={line.isAxis && showAxes ? "#94a3b8" : (line.isAxis ? "#475569" : "#1e293b")}
                            strokeWidth={line.isAxis && showAxes ? 0.08 : (line.isAxis ? 0.05 : 0.02)}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {/* Axis Arrows */}
                    {showAxes && (
                        <>
                            {/* X Axis Arrow */}
                            <path
                                d={`M ${mapX(viewMaxX - 0.2)} ${mapY(0) - 0.1} L ${mapX(viewMaxX)} ${mapY(0)} L ${mapX(viewMaxX - 0.2)} ${mapY(0) + 0.1}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth={0.05}
                                vectorEffect="non-scaling-stroke"
                            />
                            <text
                                x={mapX(viewMaxX - 0.5)}
                                y={mapY(0) + 0.4}
                                fontSize={0.4}
                                fill="#94a3b8"
                            >
                                X
                            </text>

                            {/* Y Axis Arrow */}
                            <path
                                d={`M ${mapX(0) - 0.1} ${mapY(viewMaxY - 0.2)} L ${mapX(0)} ${mapY(viewMaxY)} L ${mapX(0) + 0.1} ${mapY(viewMaxY - 0.2)}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth={0.05}
                                vectorEffect="non-scaling-stroke"
                            />
                            <text
                                x={mapX(0) + 0.3}
                                y={mapY(viewMaxY - 0.5)}
                                fontSize={0.4}
                                fill="#94a3b8"
                            >
                                Y
                            </text>
                        </>
                    )}
                    {/* Ticks */}
                    {showAxes && ticks.x.map(x => (
                        <text
                            key={`xtick-${x}`}
                            x={mapX(x)}
                            y={mapY(0) + 0.3}
                            fontSize={0.25}
                            fill="#64748b"
                            textAnchor="middle"
                        >
                            {x}
                        </text>
                    ))}
                    {showAxes && ticks.y.map(y => (
                        <text
                            key={`ytick-${y}`}
                            x={mapX(0) - 0.3}
                            y={mapY(y)}
                            fontSize={0.25}
                            fill="#64748b"
                            textAnchor="middle"
                            dominantBaseline="middle"
                        >
                            {y}
                        </text>
                    ))}
                </g>

                {/* Obstacles */}
                {obstacles?.map((obs, i) => {
                    if (obs.type === "circle") {
                        return (
                            <circle
                                key={`obs-${i}`}
                                cx={mapX(obs.x)}
                                cy={mapY(obs.y)}
                                r={obs.radius}
                                fill="#7f1d1d" // red-900
                                stroke="#ef4444" // red-500
                                strokeWidth={0.05}
                                opacity={0.6}
                            />
                        );
                    } else if (obs.type === "rectangle") {
                        // SVG rect is x,y (top-left) width, height
                        // Our rect is center x,y.
                        // And we need to map coordinates.
                        // mapX maps x directly. mapY maps y to -y.
                        // If rect center is (cx, cy), top-left in world is (cx - w/2, cy + h/2).
                        // Mapped top-left: x = mapX(cx - w/2), y = mapY(cy + h/2).
                        // SVG rect width/height are positive.
                        // Wait, mapY flips Y.
                        // mapY(cy + h/2) = -(cy + h/2) = -cy - h/2.
                        // mapY(cy - h/2) = -(cy - h/2) = -cy + h/2.
                        // The "top" in SVG is the smaller Y value.
                        // -cy - h/2 is smaller than -cy + h/2.
                        // So SVG y = mapY(cy + h/2).
                        return (
                            <rect
                                key={`obs-${i}`}
                                x={mapX(obs.x - obs.width / 2)}
                                y={mapY(obs.y + obs.height / 2)}
                                width={obs.width}
                                height={obs.height}
                                fill="#7f1d1d"
                                stroke="#ef4444"
                                strokeWidth={0.05}
                                opacity={0.6}
                            />
                        );
                    }
                    return null;
                })}

                {/* Beacons */}
                {beacons?.map((b, i) => (
                    <g key={`beacon-${i}`}>
                        <circle
                            cx={mapX(b.center.x)}
                            cy={mapY(b.center.y)}
                            r={b.radius}
                            fill="rgba(34, 197, 94, 0.1)" // green-500 with low opacity
                            stroke="#22c55e" // green-500
                            strokeWidth={0.05}
                            strokeDasharray="0.2 0.1"
                        />
                        {b.label && (
                            <text
                                x={mapX(b.center.x + (b.labelOffset?.x || 0))}
                                y={mapY(b.center.y + (b.labelOffset?.y || 0))}
                                fontSize={0.4}
                                fill="#4ade80" // green-400
                                textAnchor={b.textAnchor || "middle"}
                                dominantBaseline="middle"
                            >
                                {b.label}
                            </text>
                        )}
                    </g>
                ))}

                {/* Previous Path */}
                {previousPath && previousPath.length > 1 && (
                    <polyline
                        points={makePolyline(previousPath)}
                        fill="none"
                        stroke="#94a3b8" // slate-400
                        strokeWidth={0.05}
                        strokeOpacity={0.4}
                        strokeDasharray="0.1 0.1"
                    />
                )}

                {/* Current Path */}
                {path && path.length > 1 && (
                    <polyline
                        points={makePolyline(path)}
                        fill="none"
                        stroke="#38bdf8" // sky-400
                        strokeWidth={0.08}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Sensor Rays */}
                {sensorRays?.map((ray, i) => (
                    <g key={`ray-${i}`}>
                        <line
                            x1={mapX(ray.from.x)}
                            y1={mapY(ray.from.y)}
                            x2={mapX(ray.to.x)}
                            y2={mapY(ray.to.y)}
                            stroke="#facc15" // yellow-400
                            strokeWidth={0.03}
                            opacity={0.5}
                        />
                        <circle
                            cx={mapX(ray.to.x)}
                            cy={mapY(ray.to.y)}
                            r={0.05}
                            fill="#facc15"
                            opacity={0.8}
                        />
                    </g>
                ))}

                {/* Step Markers */}
                {stepMarkers?.map((m, i) => (
                    <g key={`step-${i}`}>
                        <circle
                            cx={mapX(m.position.x)}
                            cy={mapY(m.position.y)}
                            r={0.15}
                            fill="#1e293b"
                            stroke="#94a3b8"
                            strokeWidth={0.02}
                        />
                        {/* Text handling for flipped Y is annoying, maybe skip text for now or use a simpler marker */}
                    </g>
                ))}

                {/* Rover */}
                {roverPose && (
                    <g transform={`translate(${mapX(roverPose.x)}, ${mapY(roverPose.y)}) rotate(${-roverPose.theta * 180 / Math.PI})`}>
                        {/* Robot Body */}
                        <circle r={0.25} fill="#f97316" /> {/* orange-500 */}
                        {/* Direction Indicator */}
                        <path d="M 0.15 -0.15 L 0.35 0 L 0.15 0.15" fill="white" />
                    </g>
                )}
                {/* Sensor Label */}
                {sensorRays && sensorRays.length > 0 && (
                    <text
                        x={viewMinX + width * 0.02}
                        y={mapY(viewMinY + height * 0.02)} // Top-left in SVG space (which is flipped Y, so bottom-left in world?)
                    // Wait, mapY flips Y.
                    // viewMinY is bottom in world. mapY(viewMinY) is top in SVG.
                    // viewMaxY is top in world. mapY(viewMaxY) is bottom in SVG.
                    // We want top-left of the SVG.
                    // Top of SVG is mapY(viewMinY) (since viewMinY is small, -viewMinY is large... wait).
                    // SVG Y goes down.
                    // World Y goes up.
                    // mapY(y) = -y.
                    // If World Y is 0..5.
                    // mapY(0) = 0. mapY(5) = -5.
                    // viewBox is min-y = -5. height = 5.
                    // So SVG Y range is [-5, 0].
                    // Top of SVG is -5 (which corresponds to World Y=5).
                    // Bottom of SVG is 0 (which corresponds to World Y=0).
                    // So to put text at Top-Left of SVG:
                    // x = viewMinX + margin
                    // y = mapY(viewMaxY) + margin (in SVG coords)
                    // Actually, let's just use a DIV overlay for text, it's easier and cleaner than SVG text with flips.
                    // The user asked for "tiny label in a corner of the card".
                    // I already have a title div. I can add another one or just put it in SVG.
                    // Let's use SVG text for "in-scene" feel, or DIV for UI overlay.
                    // DIV is better for "Front sensor" label.
                    />
                )}
            </svg>

            {/* Sensor Indicator Overlay */}
            {sensorRays && sensorRays.length > 0 && (
                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-yellow-500 bg-slate-900/80 px-1.5 py-0.5 rounded border border-yellow-500/30 pointer-events-none">
                    ● Front Sensor
                </div>
            )}

            {/* Pose HUD */}
            {roverPose && (
                <div className="absolute bottom-4 right-4 text-sm font-mono text-emerald-400 bg-slate-900/90 px-4 py-3 rounded-lg border border-slate-700 pointer-events-none shadow-xl backdrop-blur-sm">
                    <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">NOVA POSE</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                        <span className="text-slate-500">x:</span>
                        <span className="text-right">{roverPose.x.toFixed(2)} m</span>
                        <span className="text-slate-500">y:</span>
                        <span className="text-right">{roverPose.y.toFixed(2)} m</span>
                        <span className="text-slate-500">θ:</span>
                        <span className="text-right">{((roverPose.theta * 180 / Math.PI) % 360).toFixed(0)}°</span>
                    </div>
                </div>
            )}
        </div>
    );
}
