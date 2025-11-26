// src/lib/programTypes.ts

export interface RobotPose {
  x: number;
  y: number;
  theta: number; // radians
}

// Low-level primitives that any simulator (Canvas, UAIbot, real rover)
// can execute. Now using a differential drive model.
export type RobotPrimitive =
  | {
    type: "drive";
    v: number;        // linear velocity (m/s)
    w: number;        // angular velocity (rad/s)
    duration: number; // seconds
  }
  | {
    type: "set_pose";
    pose: RobotPose;
  };
