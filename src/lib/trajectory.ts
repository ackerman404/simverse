import type { RobotPrimitive } from "./programTypes";

export interface PoseSample {
  t: number;     // seconds since start
  x: number;     // meters
  y: number;     // meters
  theta: number; // radians
}

export function buildTrajectory(
  program: RobotPrimitive[],
  dt = 0.02
): PoseSample[] {
  const samples: PoseSample[] = [];

  let t = 0;
  let x = 0;
  let y = 0;
  let theta = 0; // 0 = facing +x

  samples.push({ t, x, y, theta });

  for (const p of program) {
    if (p.type === "move") {
      if (p.speed <= 0) continue;
      const dist = p.distance;
      const T = Math.abs(dist / p.speed);
      const steps = Math.max(1, Math.round(T / dt));
      const stepDist = dist / steps;

      for (let i = 0; i < steps; i++) {
        x += stepDist * Math.cos(theta);
        y += stepDist * Math.sin(theta);
        t += dt;
        samples.push({ t, x, y, theta });
      }
    } else if (p.type === "turn") {
      const angleRad = (p.angleDeg * Math.PI) / 180;
      const wRad = (Math.abs(p.angularSpeed) * Math.PI) / 180;
      if (wRad <= 0) continue;

      const T = Math.abs(angleRad / wRad);
      const steps = Math.max(1, Math.round(T / dt));
      const stepAngle = angleRad / steps;

      for (let i = 0; i < steps; i++) {
        theta += stepAngle;
        t += dt;
        samples.push({ t, x, y, theta });
      }
    }
  }

  return samples;
}
