import React, { useEffect } from "react";
import type { TutorStage, TutorContext, TutorStepCaption } from "./novaTutorTypes";
import { useNovaTutor } from "./useNovaTutor";

interface NovaTutorPanelProps {
    stage: TutorStage;
    context: TutorContext | null;
    className?: string;
    onCaptionsChange?: (captions: TutorStepCaption[]) => void;
}

const stageLabel: Record<TutorStage, string> = {
    intro: "Training Intro",
    after_run: "Run Analysis",
    step_through: "Step Through",
    challenge_invite: "Challenge Invite",
};

export const NovaTutorPanel: React.FC<NovaTutorPanelProps> = ({
    stage,
    context,
    className = "",
    onCaptionsChange,
}) => {
    const { loading, response, error, refresh } = useNovaTutor({ stage, context });

    useEffect(() => {
        if (!response) return;
        if (onCaptionsChange) {
            onCaptionsChange(response.captions ?? []);
        }
    }, [response, onCaptionsChange]);

    if (!context) {
        return null; // Or a placeholder if desired
    }

    return (
        <div className={`nova-tutor-panel p-4 bg-gray-900 text-white rounded-lg border border-gray-700 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-wider">
                    TARS: {stageLabel[stage]}
                </h3>
                <button
                    onClick={refresh}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                    title="Refresh Tutor"
                >
                    ↻
                </button>
            </div>

            {loading && (
                <div className="text-sm text-gray-400 animate-pulse">
                    Nova is thinking...
                </div>
            )}

            {error && (
                <div className="text-sm text-red-400">
                    Error: {error}
                </div>
            )}

            {response && !loading && (
                <div className="space-y-4">
                    {/* Chat Messages */}
                    <div className="space-y-2">
                        {response.chat.map((msg, idx) => (
                            <p key={idx} className="text-sm leading-relaxed text-gray-200">
                                {msg}
                            </p>
                        ))}
                    </div>

                    {/* Questions */}
                    {response.questions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-800">
                            <h4 className="text-xs font-semibold text-purple-400 mb-2 uppercase">
                                Think About It
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                                {response.questions.map((q, idx) => (
                                    <li key={idx} className="text-sm text-gray-300 italic">
                                        {q}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
