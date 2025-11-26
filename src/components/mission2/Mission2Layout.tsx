import { useState, useEffect, useRef } from "react";
import { CodeEditor } from "../CodeEditor";
import { UAIbotView } from "../UAIbotView";
import { GridMapView, type GridBounds, type Beacon } from "../../sim/GridMapView";
import type { Obstacle } from "../../sim/sensors";
import { RoverBlueprintStrip } from "../mission1/RoverBlueprintStrip"; // Import from mission1
import type { Mission } from "../../missions";
import type { RobotPrimitive } from "../../lib/programTypes";
import type { RobotCommand } from "../../lib/pythonRunner";
import { buildTrajectory, type PoseSample } from "../../lib/trajectory";
import { computeFrontDistance } from "../../sim/sensors";

interface Mission2LayoutProps {
    mission: Mission;
    code: string;
    onCodeChange: (code: string) => void;
    onRun: () => void;
    onReset: () => void;
    status: string;
    lastRunSuccess: boolean | null;
    program: RobotPrimitive[];
    runId: number;
    commands: RobotCommand[];
    onResult: (success: boolean, path?: { x: number; y: number }[]) => void;
    onStartDebrief: () => void;
    onOpenGarage: () => void;
    onBack: () => void;
}

export function Mission2Layout({
    mission,
    code,
    onCodeChange,
    onRun,
    onReset,
    status,
    lastRunSuccess,
    program,
    runId,
    commands,
    onResult,
    onStartDebrief,
    onOpenGarage,
    onBack,
}: Mission2LayoutProps) {
    // --- Simulation Constants & Helpers ---
    // Mission 2 uses Meters directly (Y-up).
    // We just need a scale for the view bounds if we want to fix the aspect ratio.
    // Let's say we want to show -1 to 5m in X, and -2 to 2m in Y?
    // Start is 0,0. Wall is at 3.0.

    const bounds: GridBounds = {
        minX: -0.5,
        maxX: 4.5,
        minY: -2.0,
        maxY: 2.0
    };

    // --- Simulation State ---
    const [trajectory, setTrajectory] = useState<PoseSample[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const hasReportedResultRef = useRef(false);

    // --- 1. Build Trajectory on Run ---
    useEffect(() => {
        // When runId changes (or program), rebuild
        const traj = buildTrajectory(program);

        // Transform trajectory to World Meters (Y-up)
        // Mission 2 start is (0,0,0) usually, but let's respect mission.world.start
        const start = mission.world.start;

        const worldTraj = traj.map(p => ({
            t: p.t,
            // Rotate then translate
            x: start.x + (p.x * Math.cos(start.theta) - p.y * Math.sin(start.theta)),
            y: start.y + (p.x * Math.sin(start.theta) + p.y * Math.cos(start.theta)),
            theta: start.theta + p.theta
        }));

        // If empty, just start pose
        if (worldTraj.length === 0) {
            worldTraj.push({ t: 0, x: start.x, y: start.y, theta: start.theta });
        }

        setTrajectory(worldTraj);
        setStepIndex(0);
        setIsAnimating(true);
        hasReportedResultRef.current = false;

    }, [program, runId, mission.world]);

    // --- 2. Animation Loop ---
    useEffect(() => {
        if (!isAnimating) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const animate = () => {
            setStepIndex(prev => {
                const next = prev + 1; // 1 step per frame

                if (next >= trajectory.length) {
                    setIsAnimating(false);

                    // Check Result
                    if (!hasReportedResultRef.current) {
                        hasReportedResultRef.current = true;
                        const finalPose = trajectory[trajectory.length - 1];

                        // Mission 2 Success: Stop between 0.3m and 0.8m from the wall.
                        // We can use computeFrontDistance to check the distance to the wall.
                        // Or just check X coordinate if we know the wall is at X=3.0.
                        // Using computeFrontDistance is more robust and "sim-like".

                        const sensorWorld = {
                            obstacles: mission.world.obstacles || []
                        };

                        const dist = computeFrontDistance(finalPose, sensorWorld);

                        // Success range: 0.3 to 0.8
                        const success = dist >= 0.3 && dist <= 0.8;

                        // Convert path to {x,y} array
                        const path = trajectory.map(p => ({ x: p.x, y: p.y }));
                        onResult(success, path);
                    }
                    return trajectory.length - 1;
                }
                return next;
            });
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isAnimating, trajectory, onResult, mission.world]);

    // --- 3. GridMapView Props ---
    const beacons: Beacon[] = [{
        center: { x: mission.world.goal.x, y: mission.world.goal.y },
        radius: mission.world.goal.r,
        label: "GOAL"
    }];

    const obstacles: Obstacle[] = mission.world.obstacles || [];

    // Current Pose & Path
    const currentPose = trajectory[stepIndex];
    const pathVecs = trajectory.map(p => ({ x: p.x, y: p.y }));

    // --- Sensor Simulation for Visualization ---
    // We want to visualize what the sensor sees from the CURRENT pose.
    // We need to construct a WorldGeometry in Meters.
    // We already have 'obstacles' (GridMapView format). We need to map to 'sensors' format.

    let sensorRays: { from: { x: number; y: number }; to: { x: number; y: number } }[] | undefined;

    if (currentPose) {
        const sensorWorld = {
            obstacles: mission.world.obstacles || []
        };

        const dist = computeFrontDistance(currentPose, sensorWorld);

        const rayEnd = {
            x: currentPose.x + dist * Math.cos(currentPose.theta),
            y: currentPose.y + dist * Math.sin(currentPose.theta)
        };

        sensorRays = [{
            from: { x: currentPose.x, y: currentPose.y },
            to: rayEnd
        }];
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                        title="Back to Missions"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-emerald-500">{mission.shortName}:</span> {mission.title}
                        </h1>
                        <p className="text-xs text-slate-400">
                            {mission.briefing}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-emerald-400 font-medium">
                        Planet {mission.planet}
                    </span>
                    <span className="text-[0.7rem] text-slate-400">
                        Status: {lastRunSuccess ? "COMPLETE" : "PENDING"}
                    </span>
                </div>
            </header>

            {/* Blueprint Strip - Reused from Mission 1 for now */}
            <RoverBlueprintStrip movementOnline={true} />

            {/* Main Content */}
            <main className="flex-1 p-6 grid grid-cols-2 gap-6 h-[calc(100vh-140px)]">
                {/* Left Panel: Code Editor */}
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex-1 border border-slate-800 rounded-lg overflow-hidden">
                        <CodeEditor code={code} onChange={onCodeChange} />
                    </div>

                    <div className="flex gap-3">
                        <button
                            className="flex-1 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
                            onClick={onRun}
                        >
                            ▶ Run Sequence
                        </button>
                        <button
                            className="px-6 py-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
                            onClick={onReset}
                        >
                            ↺ Reset
                        </button>
                    </div>

                    {status && (
                        <div className={`p - 3 rounded - md text - sm border ${lastRunSuccess
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                            } `}>
                            {status}
                        </div>
                    )}
                </div>

                {/* Right Panel: Simulator */}
                <div className="h-full flex flex-col border border-slate-800 rounded-lg p-1 bg-slate-950 relative overflow-hidden">
                    <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded border border-slate-700 text-xs text-slate-300">
                        🎥 Live Feed: Hangar Cam
                    </div>

                    <div className="relative w-full h-full rounded overflow-hidden">
                        <UAIbotView
                            world={mission.world}
                            program={program}
                            runId={runId}
                        />

                        {/* Minimap Overlay */}
                        <div className="absolute bottom-4 right-4 w-1/2 aspect-[4/3] max-w-[400px] shadow-xl">
                            <GridMapView
                                bounds={bounds}
                                path={pathVecs}
                                beacons={beacons}
                                obstacles={mission.world.obstacles}
                                roverPose={currentPose}
                                sensorRays={sensorRays}
                                title={`${mission.shortName} · Sensor View`}
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Success Modal Overlay */}
            {lastRunSuccess && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-emerald-500/50 p-8 rounded-xl shadow-2xl max-w-md text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                        <div className="text-5xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Mission Complete!</h2>
                        <p className="text-slate-300 mb-6">
                            Nova stopped safely near the wall using the front sensor.
                        </p>
                        <button
                            onClick={onStartDebrief}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-colors"
                        >
                            Next Mission
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
