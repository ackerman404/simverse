// src/lib/programBuilder.ts
import type { RobotCommand } from "./pythonRunner";
import type { RobotPrimitive } from "./programTypes";

// Convert high-level commands (what kids write) into time-aware
// primitives that engines (Canvas/UAIbot) can execute.
export function buildProgram(commands: RobotCommand[]): RobotPrimitive[] {
  const primitives: RobotPrimitive[] = [];

  const defaultSpeed = 0.25;      // m/s
  const defaultTurnSpeedDeg = 45.0;  // deg/s
  const defaultTurnSpeedRad = (defaultTurnSpeedDeg * Math.PI) / 180;

  for (const cmd of commands) {
    if (cmd.op === "move_forward") {
      const dist = cmd.arg;
      if (dist === 0) continue;
      const duration = Math.abs(dist / defaultSpeed);
      // If dist is negative, we drive backwards (v is negative)
      const v = dist >= 0 ? defaultSpeed : -defaultSpeed;

      primitives.push({
        type: "drive",
        v,
        w: 0,
        duration,
      });
    } else if (cmd.op === "turn_left") {
      const angleDeg = cmd.arg;
      if (angleDeg === 0) continue;
      const duration = Math.abs(angleDeg / defaultTurnSpeedDeg);
      // Left turn = positive w
      const w = angleDeg >= 0 ? defaultTurnSpeedRad : -defaultTurnSpeedRad;

      primitives.push({
        type: "drive",
        v: 0,
        w,
        duration,
      });
    } else if (cmd.op === "turn_right") {
      const angleDeg = cmd.arg;
      if (angleDeg === 0) continue;
      const duration = Math.abs(angleDeg / defaultTurnSpeedDeg);
      // Right turn = negative w (usually). 
      // If angle is positive (turn right 90), we want w negative.
      const w = angleDeg >= 0 ? -defaultTurnSpeedRad : defaultTurnSpeedRad;

      primitives.push({
        type: "drive",
        v: 0,
        w,
        duration,
      });
    }
  }

  return primitives;
}
