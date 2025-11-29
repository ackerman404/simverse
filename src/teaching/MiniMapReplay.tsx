import { useMemo, useState, useEffect } from "react";

interface Point {
    x: number;
    y: number;
}

interface MiniMapReplayProps {
    path: Point[];
    goal?: Point;
    start?: Point;
    onStepChange?: (stepIndex: number) => void;
    stepCaption?: string;
}

export function MiniMapReplay({ path, goal, start, onStepChange, stepCaption }: MiniMapReplayProps) {
    const width = 240;
    const height = 160;
    const padding = 20;

    const [currentStep, setCurrentStep] = useState(0);

    // Reset step when path changes
    useEffect(() => {
        setCurrentStep(0);
        if (onStepChange) onStepChange(0);
    }, [path.length, onStepChange]);

    // Handle slider change
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const step = parseInt(e.target.value, 10);
        setCurrentStep(step);
        if (onStepChange) onStepChange(step);
    };

    const { points, startPoint, goalPoint, currentPoint } = useMemo(() => {
        // Determine effective start and goal points
        // If start/goal props are missing, infer from path
        const s = start || (path.length > 0 ? path[0] : { x: 0, y: 0 });
        const g = goal || (path.length > 0 ? path[path.length - 1] : { x: 0, y: 0 });

        // Collect all relevant points to calculate bounding box
        const allPoints = [...path];
        if (start) allPoints.push(start);
        if (goal) allPoints.push(goal);

        if (allPoints.length === 0) {
            return {
                points: "",
                startPoint: { cx: width / 2, cy: height / 2 },
                goalPoint: { cx: width / 2, cy: height / 2 },
                currentPoint: { cx: width / 2, cy: height / 2 },
            };
        }

        // Calculate bounds
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;

        allPoints.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // Prevent zero-size bounds (e.g. single point)
        if (maxX === minX) {
            minX -= 10;
            maxX += 10;
        }
        if (maxY === minY) {
            minY -= 10;
            maxY += 10;
        }

        const dataW = maxX - minX;
        const dataH = maxY - minY;

        // Calculate scale to fit within (width - 2*padding) x (height - 2*padding)
        const scaleX = (width - 2 * padding) / dataW;
        const scaleY = (height - 2 * padding) / dataH;
        const scale = Math.min(scaleX, scaleY);

        // Calculate offsets to center the content
        const offsetX = (width - dataW * scale) / 2 - minX * scale;
        const offsetY = (height - dataH * scale) / 2 - minY * scale;

        // Transform helper
        const transform = (p: Point) => ({
            x: p.x * scale + offsetX,
            y: p.y * scale + offsetY,
        });

        // Generate SVG point string
        const transformedPath = path
            .map(transform)
            .map((p) => `${p.x},${p.y}`)
            .join(" ");

        const tStart = transform(s);
        const tGoal = transform(g);

        // Current robot position in replay
        // If path is empty, use start. If currentStep is out of bounds, clamp it.
        const safeStep = Math.min(Math.max(0, currentStep), path.length - 1);
        const tCurrent = path.length > 0 ? transform(path[safeStep]) : tStart;

        return {
            points: transformedPath,
            startPoint: { cx: tStart.x, cy: tStart.y },
            goalPoint: { cx: tGoal.x, cy: tGoal.y },
            currentPoint: { cx: tCurrent.x, cy: tCurrent.y },
        };
    }, [path, goal, start, currentStep]);

    return (
        <div className="flex flex-col gap-2 w-[240px]">
            <div className="relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Background Grid (Optional subtle detail) */}
                    <pattern
                        id="grid"
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 20 0 L 0 0 0 20"
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.05)"
                            strokeWidth="1"
                        />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Path Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm opacity-50"
                    />

                    {/* Start Dot (Green) */}
                    <circle
                        cx={startPoint.cx}
                        cy={startPoint.cy}
                        r="3"
                        fill="#22c55e"
                        stroke="#020617"
                        strokeWidth="1"
                    />

                    {/* Goal Dot (Blue) */}
                    <circle
                        cx={goalPoint.cx}
                        cy={goalPoint.cy}
                        r="3"
                        fill="#3b82f6"
                        stroke="#020617"
                        strokeWidth="1"
                    />

                    {/* Current Robot Position (Orange) */}
                    <circle
                        cx={currentPoint.cx}
                        cy={currentPoint.cy}
                        r="5"
                        fill="#f97316"
                        stroke="#fff"
                        strokeWidth="1.5"
                    />
                </svg>
            </div>

            {/* Slider Control */}
            <input
                type="range"
                min="0"
                max={Math.max(0, path.length - 1)}
                value={currentStep}
                onChange={handleSliderChange}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            {/* TARS Caption */}
            {stepCaption && (
                <div className="mt-1 p-2 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-blue-200 font-mono italic">
                    {stepCaption}
                </div>
            )}
        </div>
    );
}
