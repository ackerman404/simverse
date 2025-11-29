import type {
    TutorStage,
    TutorContext,
    TutorResponse,
    TutorStepCaption,
} from "./novaTutorTypes";

export async function requestNovaTutorMock(
    stage: TutorStage,
    context: TutorContext
): Promise<TutorResponse> {
    const base: Omit<TutorResponse, "mode"> = {
        chat: [],
        captions: [],
        questions: [],
    };

    switch (stage) {
        case "intro":
            return {
                mode: stage,
                ...base,
                chat: [
                    "TARS online. Training Run is ready.",
                    "Drive Nova from the start dot to the beacon.",
                    "Each command nudges Nova's pose (x, y, θ°).",
                ],
                questions: [
                    "What do you think move_forward(3.25) changes most: x, y, or θ?"
                ],
            };

        case "after_run": {
            const success = context.result === "success";
            if (success) {
                return {
                    mode: stage,
                    ...base,
                    chat: [
                        "Nice run, pilot. Beacon reached.",
                        "Your code moved Nova along +x, then up along +y.",
                        "You turned a few lines of Python into a working path.",
                    ],
                    questions: [
                        "If the beacon were higher, would you change distance or turn angle?"
                    ],
                };
            } else {
                return {
                    mode: stage,
                    ...base,
                    chat: [
                        "Status: beacon not reached. No panic.",
                        "Nova stopped close, but not on the beacon.",
                        "Small changes in distance or angle can fix this.",
                    ],
                    questions: [
                        "Looking at final (x, y), should Nova move more in x or in y?"
                    ],
                };
            }
        }

        case "step_through": {
            const captions: TutorStepCaption[] = context.parsedCommands.map((cmd) => {
                let text: string;
                if (cmd.name === "move_forward" && cmd.arg != null) {
                    text = `Step ${cmd.index + 1}: Nova drives ${cmd.arg} m forward.`;
                } else if (cmd.name === "turn_left" && cmd.arg != null) {
                    text = `Step ${cmd.index + 1}: Nova turns left ${cmd.arg}°.`;
                } else if (cmd.name === "turn_right" && cmd.arg != null) {
                    text = `Step ${cmd.index + 1}: Nova turns right ${cmd.arg}°.`;
                } else {
                    text = `Step ${cmd.index + 1}: TARS note for this command.`;
                }
                return { commandIndex: cmd.index, caption: text };
            });

            return {
                mode: stage,
                ...base,
                chat: [
                    "Engaging replay mode. We step through each line.",
                    "Watch which commands move x or y, and which just change θ.",
                ],
                captions,
                questions: [
                    "Which commands change θ but leave x and y the same?"
                ],
            };
        }

        case "challenge_invite":
            return {
                mode: stage,
                ...base,
                chat: [
                    "Training complete. You earned one star.",
                    "Next is the Live Mission: new beacon, same skills.",
                ],
                questions: [
                    "Can you picture the new path in your head before you code?"
                ],
            };

        default:
            return {
                mode: stage,
                ...base,
                chat: ["TARS here. No script for this mode yet."],
            };
    }
}
