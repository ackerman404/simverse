import { useState, useEffect, useRef } from "react";
import { CodeEditor } from "../CodeEditor";

import { GridMapView, type GridBounds, type Beacon } from "../../sim/GridMapView";
import type { Obstacle } from "../../sim/sensors";
import { RoverBlueprintStrip } from "./RoverBlueprintStrip";
import type { Mission } from "../../missions";
import type { RobotPrimitive } from "../../lib/programTypes";
import type { RobotCommand } from "../../lib/pythonRunner";
import { buildTrajectory, type PoseSample } from "../../lib/trajectory";
import { computeFrontDistance } from "../../sim/sensors";

import { NovaTutorPanel } from "../../teaching/tutor/NovaTutorPanel";
import { MiniMapReplay } from "../../teaching/MiniMapReplay";
import type {
    TutorStage,
    TutorContext,
    MissionResult,
    ParsedCommand,
    Pose,
    ParsedCommandName,
    TutorStepCaption
} from "../../teaching/tutor/novaTutorTypes";

interface Mission1LayoutProps {
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
    isChallengeMode?: boolean;
}

export function Mission1Layout({
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
    isChallengeMode = false,
}: Mission1LayoutProps) {
    // --- Simulation Constants & Helpers ---
    const SCALE = 80; // px per meter
    const WORLD_HEIGHT_PX = 400; // 5m

    const toMeters = (x: number, y: number) => ({
        x: x / SCALE,
        y: (WORLD_HEIGHT_PX - y) / SCALE
    });

    // Pre-calculate World Elements in Meters (Y-up)
    const startMeters = toMeters(mission.world.start.x, mission.world.start.y);
    // start.theta is 0 (Right). In Math (Y-up), 0 is Right. So no change needed.
    const startTheta = mission.world.start.theta;

    const goalMeters = {
        ...toMeters(mission.world.goal.x, mission.world.goal.y),
        r: mission.world.goal.r / SCALE
    };

    // --- Tutor State ---
    const [tutorStage, setTutorStage] = useState<TutorStage>("intro");
    const [tutorContext, setTutorContext] = useState<TutorContext | null>(null);
    const [tutorCaptions, setTutorCaptions] = useState<TutorStepCaption[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

    // --- Simulation State ---
    const [trajectory, setTrajectory] = useState<PoseSample[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const hasReportedResultRef = useRef(false);

    // --- Helper: Build Tutor Context ---
    function buildTutorContextForTrainingRun(params: {
        code: string;
        poseHistory: PoseSample[]; // using PoseSample from trajectory
        startPose: { x: number; y: number; theta: number };
        beacon: { x: number; y: number };
        result: MissionResult;
    }): TutorContext {
        const runId = String(Date.now());

        // Simple regex parsing for commands
        const parsedCommands: ParsedCommand[] = [];
        const lines = params.code.split('\n');
        let cmdIndex = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || trimmed.length === 0) return;

            let name: ParsedCommandName = "unknown";
            let arg: number | null = null;

            const match = trimmed.match(/^(move_forward|turn_left|turn_right)\s*\(\s*([\d.]+)\s*\)/);
            if (match) {
                const op = match[1];
                const val = parseFloat(match[2]);
                if (op === "move_forward") name = "move_forward";
                else if (op === "turn_left") name = "turn_left";
                else if (op === "turn_right") name = "turn_right";
                arg = val;
            }

            if (name !== "unknown") {
                parsedCommands.push({
                    index: cmdIndex++,
                    name,
                    arg
                });
            }
        });

        // Convert trajectory to Pose[] (degrees for theta)
        const poseHistory: Pose[] = params.poseHistory.map(p => ({
            t: p.t,
            x: p.x,
            y: p.y,
            thetaDeg: (p.theta * 180) / Math.PI
        }));

        const startPose: Pose = {
            t: 0,
            x: params.startPose.x,
            y: params.startPose.y,
            thetaDeg: (params.startPose.theta * 180) / Math.PI
        };

        return {
            missionId: "mission-1",
            runId,
            code: params.code,
            parsedCommands,
            poseHistory,
            startPose,
            beacon: params.beacon,
            result: params.result,
        };
    }

    // --- 1. Build Trajectory on Run ---
    useEffect(() => {
        // When runId changes (or program), rebuild
        const traj = buildTrajectory(program);

        // Transform trajectory to World Meters (Y-up)
        const worldTraj = traj.map(p => ({
            t: p.t,
            // Simple 2D transform: rotate p by startTheta, then add to startMeters
            x: startMeters.x + (p.x * Math.cos(startTheta) - p.y * Math.sin(startTheta)),
            y: startMeters.y + (p.x * Math.sin(startTheta) + p.y * Math.cos(startTheta)),
            theta: startTheta + p.theta
        }));

        // If empty, just start pose
        if (worldTraj.length === 0) {
            worldTraj.push({ t: 0, x: startMeters.x, y: startMeters.y, theta: startTheta });
        }

        setTrajectory(worldTraj);
        setStepIndex(0);
        setIsAnimating(true);
        hasReportedResultRef.current = false;

    }, [program, runId, mission.world, startMeters.x, startMeters.y, startTheta]);

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

                        const dx = finalPose.x - goalMeters.x;
                        const dy = finalPose.y - goalMeters.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const success = dist <= goalMeters.r;

                        // Convert path to {x,y} array
                        const path = trajectory.map(p => ({ x: p.x, y: p.y }));
                        onResult(success, path);

                        // Build Tutor Context (Training Only)
                        if (!isChallengeMode) {
                            const result: MissionResult = success ? "success" : "missed_beacon";
                            // Note: could add timeout/runtime_error logic if we had it

                            const ctx = buildTutorContextForTrainingRun({
                                code,
                                poseHistory: trajectory,
                                startPose: { x: startMeters.x, y: startMeters.y, theta: startTheta },
                                beacon: { x: goalMeters.x, y: goalMeters.y },
                                result
                            });

                            setTutorContext(ctx);
                            setTutorStage("after_run");
                        }
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
    }, [isAnimating, trajectory, onResult, goalMeters, isChallengeMode, code, startMeters, startTheta]);

    // --- 3. GridMapView Props ---
    const bounds: GridBounds = {
        minX: 0,
        maxX: 600 / SCALE, // 7.5m
        minY: 0,
        maxY: WORLD_HEIGHT_PX / SCALE  // 5m
    };

    const beacons: Beacon[] = [
        {
            center: { x: 0, y: 0 },
            radius: 0
        },
        {
            center: { x: goalMeters.x, y: goalMeters.y },
            radius: goalMeters.r
        }
    ];

    const obstacles: Obstacle[] = [];
    if (mission.world.crater) {
        const c = toMeters(mission.world.crater.x, mission.world.crater.y);
        obstacles.push({
            type: "circle",
            x: c.x,
            y: c.y,
            radius: mission.world.crater.rx / SCALE
        });
    }

    // Current Pose & Path
    const currentPose = trajectory[stepIndex];
    const pathVecs = trajectory.map(p => ({ x: p.x, y: p.y }));

    // --- Sensor Simulation for Visualization ---
    let sensorRays: { from: { x: number; y: number }; to: { x: number; y: number } }[] | undefined;

    if (currentPose) {
        const sensorWorld = {
            obstacles: obstacles
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

    // Get current caption for step-through
    const currentCaption =
        tutorCaptions.find(c => c.commandIndex === currentStepIndex)?.caption ?? "";

    return (
        <div className="h-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col">
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
                            <span className="text-emerald-500">Mission 1:</span> Wake Prototype R-0
                        </h1>
                        <p className="text-xs text-slate-400">
                            Initialize movement systems and reach the test pad.
                        </p>
                    </div>
                    <button
                        onClick={onOpenGarage}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm font-medium text-slate-200 transition-colors flex items-center gap-2"
                    >
                        <span>🔧</span> Garage
                    </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold tracking-wider ${isChallengeMode ? "bg-red-900/50 text-red-400 border border-red-500/30" : "bg-emerald-900/50 text-emerald-400 border border-emerald-500/30"}`}>
                        {isChallengeMode ? "LIVE MISSION" : "TRAINING RUN"}
                    </span>
                    <span className="text-[0.7rem] text-slate-400">
                        Status: {lastRunSuccess ? "COMPLETE" : "PENDING"}
                    </span>
                </div>
            </header>

            {/* Blueprint Strip */}
            <RoverBlueprintStrip movementOnline={!!lastRunSuccess} />

            {/* Main Layout: Flex container to hold Content + Tutor Panel */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-2 gap-6">
                    {/* Left Panel: Code Editor */}
                    <div className="flex flex-col gap-4 min-h-[500px] h-full">
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
                            <div className={`p-3 rounded-md text-sm border flex justify-between items-center ${lastRunSuccess
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-slate-800 border-slate-700 text-slate-300"
                                }`}>
                                <span>{status}</span>

                                {/* Step Through Button (Training Only) */}
                                {!isChallengeMode && tutorContext && (
                                    <button
                                        onClick={() => setTutorStage("step_through")}
                                        className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                                    >
                                        Step Through
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Simulator or Replay */}
                    <div className="flex flex-col border border-slate-800 rounded-lg p-1 bg-slate-950 relative overflow-hidden min-h-[500px] h-full">
                        <div className="relative w-full h-full rounded overflow-hidden flex items-center justify-center">
                            {tutorStage === "step_through" && !isChallengeMode ? (
                                <MiniMapReplay
                                    path={pathVecs}
                                    goal={{ x: goalMeters.x, y: goalMeters.y }}
                                    start={{ x: startMeters.x, y: startMeters.y }}
                                    onStepChange={setCurrentStepIndex}
                                    stepCaption={currentCaption}
                                />
                            ) : (
                                <GridMapView
                                    bounds={bounds}
                                    path={pathVecs}
                                    beacons={beacons}
                                    obstacles={[]} // Hide obstacles (crater) from visual map as requested
                                    roverPose={currentPose}
                                    sensorRays={sensorRays}
                                    title="Mission 01 · Nova's Map"
                                    className="w-full h-full"
                                    showAxes={true}
                                />
                            )}
                        </div>
                    </div>
                </main>

                {/* Tutor Panel (Training Only) */}
                {!isChallengeMode && (
                    <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto">
                        <NovaTutorPanel
                            stage={tutorStage}
                            context={tutorContext}
                            onCaptionsChange={setTutorCaptions}
                        />
                    </div>
                )}
            </div>

            {/* Success Modal Overlay */}
            {lastRunSuccess && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-emerald-500/50 p-8 rounded-xl shadow-2xl max-w-md text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                        <div className="text-5xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {isChallengeMode ? "Mission Complete!" : "Training Run Complete!"}
                        </h2>
                        <p className="text-slate-300 mb-6">
                            {isChallengeMode
                                ? "Prototype R-0 has successfully reached the test pad. Movement systems are now ONLINE."
                                : "You've successfully guided Nova to the beacon. Proceed to Debrief to analyze the flight path."}
                        </p>
                        <div className="flex gap-3 justify-center">
                            {isChallengeMode ? (
                                <button
                                    onClick={onStartDebrief}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Collect Reward
                                </button>
                            ) : (
                                <button
                                    onClick={onStartDebrief}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-colors"
                                >
                                    Start Debrief
                                </button>
                            )}

                            {!isChallengeMode && tutorContext && (
                                <button
                                    onClick={() => setTutorStage("step_through")}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors"
                                >
                                    Step Through
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
