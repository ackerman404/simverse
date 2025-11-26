import { useState } from "react";
import { SolarSystemView3D } from "./SolarSystemView3D";
import type { Mission } from "../missions";

interface SolarSystemHomeProps {
    missions: Mission[];
    completedMissions: Record<string, boolean>;
    trainingProgress: Record<string, boolean>;
    onStartMission: (id: string) => void;
    onOpenGarage: () => void;
}

export function SolarSystemHome({
    missions,
    completedMissions,
    trainingProgress,
    onStartMission,
    onOpenGarage,
}: SolarSystemHomeProps) {
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
        missions.length > 0 ? missions[0].id : null
    );

    const selectedMission = missions.find((m) => m.id === selectedMissionId);
    const isComplete = selectedMission ? completedMissions[selectedMission.id] : false;
    const isTrained = selectedMission ? trainingProgress[selectedMission.id] : false;

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden text-slate-100">
            {/* Background Stars (CSS) */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none" />

            {/* 3D View */}
            <div className="absolute inset-0 z-0">
                <SolarSystemView3D
                    missions={missions}
                    selectedMissionId={selectedMissionId}
                    onSelectMission={setSelectedMissionId}
                    completedMissions={completedMissions}
                />
            </div>

            {/* Header / HUD */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        SIMVERSE <span className="text-emerald-500">NOVA</span>
                    </h1>
                    <p className="text-slate-400 text-sm drop-shadow-sm">
                        Autonomous Rover Simulation System
                    </p>
                </div>

                <button
                    onClick={onOpenGarage}
                    className="pointer-events-auto px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-200 font-medium transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
                >
                    <span>🔧</span> Rover Garage
                </button>
            </div>

            {/* Mission Selector (Bottom/Right) */}
            <div className="absolute bottom-8 right-8 w-96 max-w-[calc(100vw-4rem)] z-10 flex flex-col gap-4 pointer-events-none">

                {/* Mission List Pills */}
                <div className="flex flex-wrap justify-end gap-2 pointer-events-auto">
                    {missions.map((m) => {
                        const isActive = m.id === selectedMissionId;
                        const isDone = completedMissions[m.id];
                        return (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMissionId(m.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isActive
                                    ? "bg-emerald-500 text-slate-900 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20"
                                    : isDone
                                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/80"
                                        : "bg-slate-900/60 text-slate-400 border-slate-700 hover:bg-slate-800/80"
                                    }`}
                            >
                                {m.shortName}
                                {isDone && <span className="ml-1">✓</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Active Mission Card */}
                {selectedMission && (
                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl pointer-events-auto animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                Current Objective
                            </span>
                            {isComplete ? (
                                <div className="flex gap-1">
                                    <span className="text-emerald-400 text-xs">★</span>
                                    <span className="text-emerald-400 text-xs">★</span>
                                    <span className="bg-emerald-500/20 text-emerald-300 text-[0.65rem] px-2 py-0.5 rounded-full border border-emerald-500/30 ml-2">
                                        MASTERED
                                    </span>
                                </div>
                            ) : isTrained ? (
                                <div className="flex gap-1">
                                    <span className="text-emerald-400 text-xs">★</span>
                                    <span className="text-slate-600 text-xs">★</span>
                                    <span className="bg-blue-500/20 text-blue-300 text-[0.65rem] px-2 py-0.5 rounded-full border border-blue-500/30 ml-2">
                                        TRAINED
                                    </span>
                                </div>
                            ) : (
                                <div className="flex gap-1 opacity-30">
                                    <span className="text-slate-600 text-xs">★</span>
                                    <span className="text-slate-600 text-xs">★</span>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">
                            {selectedMission.title}
                        </h2>
                        <div className="text-slate-400 text-sm mb-4 flex items-center gap-2">
                            <span>Planet {selectedMission.planet}</span>
                            <span>•</span>
                            <span>Mission {selectedMission.index}</span>
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {selectedMission.briefing}
                        </p>

                        <button
                            onClick={() => onStartMission(selectedMission.id)}
                            className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            {isComplete ? "Replay Mission" : isTrained ? "Continue to Challenge" : "Start Mission"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
