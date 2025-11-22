import React from "react";
import { CodeEditor } from "../CodeEditor";
import { UAIbotView } from "../UAIbotView";
import { SimulatorView } from "../SimulatorView";
import { RoverBlueprintStrip } from "./RoverBlueprintStrip";
import type { Mission } from "../../missions";
import type { RobotPrimitive } from "../../lib/programTypes";
import type { RobotCommand } from "../../lib/pythonRunner";

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
    onResult: (success: boolean) => void;
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
}: Mission1LayoutProps) {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-emerald-500">Mission 1:</span> Wake Prototype R-0
                    </h1>
                    <p className="text-xs text-slate-400">
                        Initialize movement systems and reach the test pad.
                    </p>
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

            {/* Blueprint Strip */}
            <RoverBlueprintStrip movementOnline={!!lastRunSuccess} />

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
                        <div className={`p-3 rounded-md text-sm border ${lastRunSuccess
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-slate-800 border-slate-700 text-slate-300"
                            }`}>
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
                        <div className="absolute bottom-4 right-4 w-1/3 aspect-square max-w-[200px] border border-slate-700 rounded bg-slate-900/90 shadow-xl">
                            <SimulatorView
                                commands={commands}
                                program={program}
                                runId={runId}
                                world={mission.world}
                                onResult={onResult}
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
                            Prototype R-0 has successfully reached the test pad. Movement systems are now
                            <span className="text-emerald-400 font-bold"> ONLINE</span>.
                        </p>
                        <button
                            onClick={onReset}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-colors"
                        >
                            Continue Mission
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
