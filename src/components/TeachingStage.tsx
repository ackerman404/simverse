import { useState } from "react";
import type { TeachingConfig } from "../missions";
import { MiniMapReplay } from "../teaching/MiniMapReplay";

interface TeachingStageProps {
    config: TeachingConfig;
    onComplete: () => void;
    lastSuccessfulRun?: {
        missionId: string;
        path: { x: number; y: number }[];
    } | null;
    missionId: string;
    challengeConfig?: {
        title: string;
        description: string;
    };
    onStartChallenge?: () => void;
}

function MovementQuickExperiment({ onComplete }: { onComplete: () => void }) {
    const [testDistance, setTestDistance] = useState(1.0);
    const [hasInteracted, setHasInteracted] = useState(false);

    const idealDistance = 3.0;
    const tolerance = 0.25;
    const isCorrect = Math.abs(testDistance - idealDistance) <= tolerance;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTestDistance(parseFloat(e.target.value));
        setHasInteracted(true);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center text-white">
                Try it yourself
            </h2>
            <p className="text-center text-slate-400">
                Drag the slider to change the last move_forward distance and see if Nova would reach the beacon.
            </p>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>0.5m</span>
                    <span>4.0m</span>
                </div>
                <input
                    type="range"
                    min={0.5}
                    max={4.0}
                    step={0.25}
                    value={testDistance}
                    onChange={handleChange}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="text-center font-mono text-emerald-400 text-lg">
                    move_forward({testDistance.toFixed(2)})
                </div>
            </div>

            <div className={`p-4 rounded-lg border text-center transition-all ${hasInteracted
                ? (isCorrect ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400")
                : "opacity-0"
                }`}>
                {hasInteracted && (isCorrect
                    ? "✅ Nice! With this distance Nova would reach the beacon."
                    : "Nova would stop before or after the beacon. Try a bit more or a bit less.")}
            </div>

            <div className="flex justify-center pt-2">
                <button
                    onClick={onComplete}
                    disabled={!hasInteracted}
                    className={`px-8 py-3 font-bold rounded-full shadow-lg transition-all ${hasInteracted
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 hover:scale-105 shadow-emerald-900/20"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                >
                    Complete Debrief & Continue
                </button>
            </div>
        </div>
    );
}

export function TeachingStage({ config, onComplete, lastSuccessfulRun, missionId, onStartChallenge }: TeachingStageProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);

    const handleOptionSelect = (index: number) => {
        if (!config.question) return;
        if (showFeedback && selectedOption === config.question.correctIndex) return; // Prevent changing if already correct
        setSelectedOption(index);
        setShowFeedback(true);
    };

    const isCorrect = config.question ? selectedOption === config.question.correctIndex : true;
    const isMovementMission = config.conceptTitle.includes("Movement System");

    const showReplay = lastSuccessfulRun && lastSuccessfulRun.missionId === missionId;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">
                        {config.conceptTitle}
                    </h1>
                </div>

                {/* 1. Watch Nova's path */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-200 mb-4">Watch Nova's path</h2>
                    <div className="flex justify-center mb-4">
                        {showReplay ? (
                            <MiniMapReplay path={lastSuccessfulRun.path} />
                        ) : (
                            <div className="aspect-video w-60 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-center p-4">
                                <span className="text-slate-500 text-xs">
                                    Complete this mission once to see Nova's path here.
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-300">
                        {config.recapText}
                    </p>
                </div>

                {/* 2. Pose Table OR Your 3 moves */}
                {config.poseTable ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 overflow-hidden">
                        <h2 className="text-lg font-semibold text-slate-200 mb-4">Mission Log</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-400">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-2 rounded-l-lg">Step</th>
                                        <th className="px-4 py-2">Command</th>
                                        <th className="px-4 py-2">Pose Before</th>
                                        <th className="px-4 py-2 rounded-r-lg">Pose After</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {config.poseTable.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-800/50 last:border-0">
                                            <td className="px-4 py-3 font-mono text-slate-500">{row.step}</td>
                                            <td className="px-4 py-3 font-mono text-emerald-400">{row.command}</td>
                                            <td className="px-4 py-3 font-mono">{row.poseBefore}</td>
                                            <td className="px-4 py-3 font-mono text-white">{row.poseAfter}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    config.moves && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-slate-200 mb-4">Your 3 moves</h2>
                            <div className="space-y-2">
                                {config.moves.map((move, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                        <span className="flex-none w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </span>
                                        <code className="text-emerald-300 font-mono text-sm">{move}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {/* 2.5 Concept Blocks */}
                {config.conceptBlocks && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.conceptBlocks.map((block, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-emerald-400 mb-3">{block.title}</h3>
                                <ul className="space-y-2">
                                    {block.text.map((line, j) => (
                                        <li key={j} className="text-slate-300 text-sm flex items-start gap-2">
                                            <span className="text-slate-600 mt-1">•</span>
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Quick Check OR Experiment */}
                {isMovementMission ? (
                    <MovementQuickExperiment onComplete={onComplete} />
                ) : (
                    <div className="space-y-4">
                        {/* Quiz Section (Optional) */}
                        {config.question && (
                            <>
                                <h2 className="text-xl font-semibold text-center text-white">
                                    Quick Check
                                </h2>
                                <p className="text-center text-slate-400">
                                    {config.question.text}
                                </p>

                                <div className="grid grid-cols-1 gap-3 mt-4">
                                    {config.question.options.map((option, idx) => {
                                        let buttonClass =
                                            "w-full p-4 rounded-lg border text-left transition-all duration-200 ";

                                        if (showFeedback && selectedOption === idx) {
                                            if (idx === config.question!.correctIndex) {
                                                buttonClass += "bg-emerald-500/20 border-emerald-500 text-emerald-200";
                                            } else {
                                                buttonClass += "bg-red-500/20 border-red-500 text-red-200";
                                            }
                                        } else if (showFeedback && idx === config.question!.correctIndex) {
                                            // Show correct answer if user picked wrong
                                            buttonClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 dashed";
                                        } else {
                                            buttonClass += "bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600 text-slate-300";
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                disabled={showFeedback && isCorrect}
                                                className={buttonClass}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>{option}</span>
                                                    {showFeedback && selectedOption === idx && (
                                                        <span>
                                                            {idx === config.question!.correctIndex ? "✅" : "❌"}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Feedback Area */}
                                {showFeedback && (
                                    <div className={`mt-6 p-4 rounded-lg border animate-in fade-in zoom-in-95 duration-300 ${isCorrect
                                        ? "bg-emerald-900/20 border-emerald-500/30"
                                        : "bg-red-900/20 border-red-500/30"
                                        }`}>
                                        <p className={`text-sm ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                                            {isCorrect ? config.question.feedbackCorrect : config.question.feedbackIncorrect}
                                        </p>
                                    </div>
                                )}

                                {/* Complete Button for Quiz */}
                                {showFeedback && isCorrect && (
                                    <div className="flex justify-center pt-4 animate-in fade-in slide-in-from-bottom-2">
                                        <button
                                            onClick={onComplete}
                                            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                                        >
                                            Complete Debrief & Continue
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Challenge Prompt (Training Complete) */}
                        {config.challengePrompt && onStartChallenge && (
                            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center animate-in fade-in slide-in-from-bottom-3 delay-100">
                                <h3 className="text-emerald-400 font-semibold mb-2">{config.challengePrompt.title}</h3>
                                <p className="text-slate-400 text-sm mb-4">{config.challengePrompt.text}</p>
                                <button
                                    onClick={onStartChallenge}
                                    className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 flex items-center gap-2 mx-auto"
                                >
                                    <span>🚀</span>
                                    {config.challengePrompt.buttonText}
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
