import type { RobotPrimitive } from "./programTypes";

export interface PoseSample {
  t: number;     // seconds since start
  x: number;     // meters
  y: number;     // meters
  theta: number; // radians
}

export function buildTrajectory(
  program: RobotPrimitive[],
  startPose = { x: 0, y: 0, theta: 0 },
  dt = 0.02
): PoseSample[] {
  const samples: PoseSample[] = [];

  let t = 0;
  let { x, y, theta } = startPose;

  samples.push({ t, x, y, theta });

  for (const p of program) {
    if (p.type === "drive") {
      const { v, w, duration } = p;
      if (duration <= 0) continue;

      const steps = Math.max(1, Math.round(duration / dt));
      const dtStep = duration / steps; // precise dt for this segment

      for (let i = 0; i < steps; i++) {
        // Simple Euler integration
        // x_new = x + v * cos(theta) * dt
        // y_new = y + v * sin(theta) * dt
        // theta_new = theta + w * dt

        // Half-step or Runge-Kutta would be better but Euler is fine for this MVP
        x += v * Math.cos(theta) * dtStep;
        y += v * Math.sin(theta) * dtStep;
        theta += w * dtStep;
        t += dtStep;

        samples.push({ t, x, y, theta });
      }
    } else if (p.type === "set_pose") {
      x = p.pose.x;
      y = p.pose.y;
      theta = p.pose.theta;
      // Instantaneous update
      samples.push({ t, x, y, theta });
    }
  }

  return samples;
}
