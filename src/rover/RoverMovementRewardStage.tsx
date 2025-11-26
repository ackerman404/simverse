import { useState } from "react";
import { RoverPartViewer3D } from "./RoverPartViewer3D";

export interface MovementConfig {
    color: string;
    wheelScale: number;
}

interface RoverMovementRewardStageProps {
    movementConfig: MovementConfig;
    onUpdateMovement: (config: MovementConfig) => void;
    onDone: () => void;
    justUnlocked?: boolean;
}

function MovementUnlockOverlay({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center animate-in zoom-in-95 duration-300 ease-out">

                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-4 uppercase tracking-wider">
                    New Part Unlocked
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    Movement System Online
                </h2>

                <p className="text-slate-400 mb-8 leading-relaxed">
                    Nova's wheels are now yours to customize. Spin your rover and pick a style!
                </p>

                <button
                    onClick={onDismiss}
                    className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-colors"
                >
                    Start customizing
                </button>
            </div>
        </div>
    );
}

const COLORS = [
    "#f97316", // Orange (Default)
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#a855f7", // Purple
    "#eab308", // Yellow
];

export function RoverMovementRewardStage({
    movementConfig,
    onUpdateMovement,
    onDone,
    justUnlocked = false,
}: RoverMovementRewardStageProps) {
    const [showUnlockOverlay, setShowUnlockOverlay] = useState(justUnlocked);
    const [colorPulse, setColorPulse] = useState(false);

    const handleColorChange = (color: string) => {
        onUpdateMovement({ ...movementConfig, color });
        setColorPulse(true);
        setTimeout(() => setColorPulse(false), 200);
    };

    const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        onUpdateMovement({ ...movementConfig, wheelScale: val });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 relative">
            {showUnlockOverlay && (
                <MovementUnlockOverlay onDismiss={() => setShowUnlockOverlay(false)} />
            )}

            <div className="max-w-5xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Rover Garage · Movement System</h1>
                    <p className="text-slate-400 mt-2">
                        Customize your rover's wheels for better traction on alien terrain.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">

                    {/* Left: 3D Viewer */}
                    <div className="lg:col-span-2 bg-black/40 rounded-2xl border border-slate-800 overflow-hidden relative">
                        <RoverPartViewer3D
                            movementConfig={movementConfig}
                            introSpin={justUnlocked && !showUnlockOverlay}
                            pulse={colorPulse}
                        />
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-300">
                            Interactive Preview
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex flex-col gap-6 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">

                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                Wheel Alloy Color
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => handleColorChange(c)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${movementConfig.color === c
                                            ? "border-white shadow-lg shadow-white/20 scale-110"
                                            : "border-transparent hover:border-slate-500"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Scale Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-medium text-slate-300">
                                    Wheel Size
                                </label>
                                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">
                                    {movementConfig.wheelScale.toFixed(2)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0.8}
                                max={1.2}
                                step={0.05}
                                value={movementConfig.wheelScale}
                                onChange={handleScaleChange}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[0.65rem] text-slate-500 mt-2 font-mono">
                                <span>0.8x</span>
                                <span>1.0x</span>
                                <span>1.2x</span>
                            </div>
                        </div>

                        <div className="flex-1" />

                        {/* Save Button */}
                        <button
                            onClick={onDone}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Save design & continue
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}
