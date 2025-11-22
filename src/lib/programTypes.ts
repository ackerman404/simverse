// src/lib/programTypes.ts

// Low-level primitives that any simulator (Canvas, UAIbot, real rover)
// can execute.
export type RobotPrimitive =
  | {
      type: "move";       // drive straight
      distance: number;   // meters (positive = forward, negative = backward)
      speed: number;      // m/s
    }
  | {
      type: "turn";          // rotate in place
      angleDeg: number;      // degrees (+ = left, - = right)
      angularSpeed: number;  // deg/s (sign will be handled from angle)
    };
