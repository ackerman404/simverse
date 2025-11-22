// src/lib/programBuilder.ts
import type { RobotCommand } from "./pythonRunner";
import type { RobotPrimitive } from "./programTypes";

// Convert high-level commands (what kids write) into time-aware
// primitives that engines (Canvas/UAIbot) can execute.
export function buildProgram(commands: RobotCommand[]): RobotPrimitive[] {
  const primitives: RobotPrimitive[] = [];

  const defaultSpeed = 0.25;      // m/s, tweak later
  const defaultTurnSpeed = 45.0;  // deg/s

  for (const cmd of commands) {
    if (cmd.op === "move_forward") {
      primitives.push({
        type: "move",
        distance: cmd.arg,
        speed: defaultSpeed,
      });
    } else if (cmd.op === "turn_left") {
      primitives.push({
        type: "turn",
        angleDeg: +cmd.arg,
        angularSpeed: defaultTurnSpeed,
      });
    } else if (cmd.op === "turn_right") {
      primitives.push({
        type: "turn",
        angleDeg: -cmd.arg,
        angularSpeed: defaultTurnSpeed,
      });
    }
  }

  return primitives;
}
