import { RoverPartViewer3D } from "./RoverPartViewer3D";
import type { MovementConfig } from "./RoverMovementRewardStage";

interface RoverGarageProps {
    roverConfig: {
        movement: MovementConfig;
    };
    onCustomizeMovement: () => void;
    onBack: () => void;
}

export function RoverGarage({ roverConfig, onCustomizeMovement, onBack }: RoverGarageProps) {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4 bg-slate-950/50">
                <h1 className="text-xl font-bold">Rover Garage</h1>
                <p className="text-sm text-slate-400 mt-1">
                    This is your rover so far. You'll unlock more systems as you complete missions.
                </p>
            </header>

            <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Rover Preview */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 text-slate-200">Rover Preview</h2>
                    <div className="flex-1 rounded-xl border border-slate-800 bg-black/40 overflow-hidden relative min-h-[300px]">
                        <RoverPartViewer3D
                            movementConfig={roverConfig.movement}
                            introSpin={false}
                        />
                    </div>
                </div>

                {/* Right: Rover Blueprint */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 flex flex-col">
                    <h2 className="text-lg font-semibold mb-6 text-slate-200">Rover Blueprint</h2>

                    <div className="space-y-4 flex-1">
                        {/* Movement - Online */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-emerald-500/30">
                            <span className="font-medium text-slate-200">Movement</span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                ONLINE
                            </span>
                        </div>

                        {/* Locked Systems */}
                        {["Sensing", "Brain", "Patterns", "Autonomy"].map((system) => (
                            <div key={system} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800 opacity-60">
                                <span className="font-medium text-slate-400">{system}</span>
                                <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                    LOCKED
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <button
                            onClick={onCustomizeMovement}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            Customize Movement
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer / Bottom-right Action */}
            <div className="p-6 flex justify-end">
                <button
                    onClick={onBack}
                    className="px-6 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                >
                    Back to Missions
                </button>
            </div>
        </div>
    );
}
