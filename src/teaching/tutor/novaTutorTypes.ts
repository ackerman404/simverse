export type ParsedCommandName =
    | "move_forward"
    | "turn_left"
    | "turn_right"
    | "unknown";

export interface Pose {
    t: number;        // time or step index
    x: number;        // meters
    y: number;        // meters
    thetaDeg: number; // heading in degrees (0° right, 90° up, etc.)
}

export interface ParsedCommand {
    index: number;          // 0-based command index in main()
    name: ParsedCommandName;
    arg: number | null;     // distance in meters or angle in degrees
}

export type MissionResult =
    | "success"
    | "missed_beacon"
    | "timeout"
    | "runtime_error";

export type TutorStage =
    | "intro"
    | "after_run"
    | "step_through"
    | "challenge_invite";

export interface TutorContext {
    missionId: "mission-1";
    runId: string;
    code: string;
    parsedCommands: ParsedCommand[];
    poseHistory: Pose[];
    startPose: Pose;
    beacon: { x: number; y: number };
    result: MissionResult;
}

export interface TutorStepCaption {
    commandIndex: number;
    caption: string;
}

export interface TutorResponse {
    mode: TutorStage;
    chat: string[];               // 1–3 short sentences
    captions: TutorStepCaption[]; // can be empty except in step_through
    questions: string[];          // 1–2 questions
}
