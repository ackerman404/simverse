import { useEffect, useRef } from "react";
import type { RobotCommand } from "../lib/pythonRunner";
import type { WorldConfig } from "../missions";
import type { RobotPrimitive } from "../lib/programTypes";
import { buildTrajectory, type PoseSample } from "../lib/trajectory";

interface SimulatorViewProps {
  commands: RobotCommand[];
  program: RobotPrimitive[]; // not used yet, but threaded through
  runId: number;
  world: WorldConfig;
  onResult?: (success: boolean, path?: { x: number; y: number }[]) => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}


export function SimulatorView({
  commands,
  program,
  runId,
  world,
  onResult,
}: SimulatorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // We'll use a ref to track the current step so the animation loop can access it
  const stateRef = useRef({
    stepIndex: 0,
    trajectory: [] as PoseSample[],
    isAnimating: false,
    hasReportedResult: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { start, goal, crater } = world;

    // Pre-generate stars
    const stars: { x: number; y: number }[] = [];
    const groundTop = canvas.height * 0.55;
    for (let i = 0; i < 25; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * groundTop * 0.95,
      });
    }

    // --- Coordinate Transform ---
    // Scale: 80 px/m (derived from Mission 1: 3.25m = 260px)
    const SCALE = 80;

    // --- Initialization ---

    // 1. Build trajectory from program (in meters, relative to 0,0)
    const rawTrajectory = buildTrajectory(program);

    // 2. Transform to canvas coordinates (pixels, relative to start)
    // Canvas Y is inverted relative to math Y.
    const trajectory: PoseSample[] = rawTrajectory.map(p => ({
      t: p.t,
      x: start.x + p.x * SCALE,
      y: start.y - p.y * SCALE, // Invert Y
      theta: start.theta + p.theta
    }));

    // If no program or empty, just put rover at start
    if (trajectory.length === 0) {
      trajectory.push({ x: start.x, y: start.y, theta: start.theta, t: 0 });
    }

    // Reset state for new run
    stateRef.current = {
      stepIndex: 0,
      trajectory,
      isAnimating: true,
      hasReportedResult: false,
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // --- Drawing Helpers ---

    // Helper: Draw the static environment
    function drawEnvironment() {
      if (!ctx || !canvas) return;
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Space background
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground band
      ctx.fillStyle = "#020817";
      ctx.fillRect(0, groundTop, canvas.width, canvas.height - groundTop);

      // Ground highlight strip
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, groundTop, canvas.width, 6);

      // Stars
      ctx.fillStyle = "#e5e7eb";
      for (const s of stars) {
        ctx.fillRect(s.x, s.y, 1, 1);
      }

      // Goal region (beacon)
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34,197,94,0.18)";
      ctx.fill();
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Beacon pole
      ctx.beginPath();
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 2;
      ctx.moveTo(goal.x, goal.y + goal.r);
      ctx.lineTo(goal.x, goal.y + goal.r + 22);
      ctx.stroke();

      // Beacon light
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();

      // Crater obstacle
      if (crater) {
        ctx.fillStyle = "#b91c1c";
        ctx.beginPath();
        ctx.ellipse(
          crater.x,
          crater.y,
          crater.rx,
          crater.ry,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#7f1d1d";
        ctx.beginPath();
        ctx.ellipse(
          crater.x,
          crater.y + 6,
          crater.rx * 0.65,
          crater.ry * 0.65,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Landing site
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Helper: Draw the rover
    function drawRover(x: number, y: number, theta: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-theta);

      const bodyW = 30;
      const bodyH = 16;
      const wheelR = 4;

      // Wheels
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.arc(-bodyW * 0.4, bodyH * 0.7, wheelR, 0, Math.PI * 2);
      ctx.arc(bodyW * 0.4, bodyH * 0.7, wheelR, 0, Math.PI * 2);
      ctx.arc(-bodyW * 0.4, -bodyH * 0.7, wheelR, 0, Math.PI * 2);
      ctx.arc(bodyW * 0.4, -bodyH * 0.7, wheelR, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = "#f97316";
      drawRoundedRect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 4);
      ctx.fill();

      // Mast
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -bodyH / 2);
      ctx.lineTo(0, -bodyH / 2 - 14);
      ctx.stroke();

      // Camera head
      ctx.fillStyle = "#0ea5e9";
      drawRoundedRect(ctx, -6, -bodyH / 2 - 20, 12, 8, 3);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(0, -bodyH / 2 - 16, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Helper: Draw the full planned path
    function drawPath(traj: PoseSample[]) {
      if (!ctx || traj.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(traj[0].x, traj[0].y);
      for (let i = 1; i < traj.length; i++) {
        ctx.lineTo(traj[i].x, traj[i].y);
      }
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)"; // Faint blue
      ctx.lineWidth = 3;
      ctx.stroke();
    }



    // Animation Loop
    function animate(_t: number) {
      if (!ctx || !canvas) return;

      const state = stateRef.current;
      const { trajectory, stepIndex } = state;

      // 1. Draw Scene
      drawEnvironment();
      drawPath(trajectory);

      // 2. Get current pose
      // Clamp index to bounds
      const safeIndex = Math.min(stepIndex, trajectory.length - 1);
      const pose = trajectory[safeIndex];

      drawRover(pose.x, pose.y, pose.theta);

      // 3. Check if finished
      const isFinished = stepIndex >= trajectory.length - 1;

      if (isFinished) {
        // Animation done.
        // Check success condition based on FINAL pose
        const finalPose = trajectory[trajectory.length - 1];
        const dx = finalPose.x - goal.x;
        const dy = finalPose.y - goal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const success = dist <= goal.r;

        // Map trajectory to simple points
        const path = trajectory.map((p) => ({ x: p.x, y: p.y }));

        // Report result ONCE
        if (!state.hasReportedResult && onResult) {
          state.hasReportedResult = true;
          onResult(success, path);
        }

        // If success, continue animation loop ONLY for the "pulse" effect
        if (success) {
          // Use a simple counter or time for pulse
          const pulsePhase = (Date.now() % 2000) / 2000;

          // Pulsing rings
          const numRings = 3;
          for (let i = 0; i < numRings; i++) {
            const p = (pulsePhase + i / numRings) % 1;
            const r = goal.r + p * 30;
            const alpha = (1 - p) * 0.6;

            ctx.beginPath();
            ctx.arc(goal.x, goal.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Sparkle at rover
          ctx.save();
          ctx.translate(finalPose.x, finalPose.y);
          ctx.beginPath();
          ctx.arc(0, -18, 3 + 2 * Math.sin(Date.now() / 100), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(248,250,252,0.9)";
          ctx.fill();
          ctx.restore();

          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Stop animation if failed
          state.isAnimating = false;
        }
      } else {
        // Not finished, advance step
        // Speed: 1 step per frame to match UAIbotView default
        state.stepIndex += 1;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [commands, program, runId, world, onResult]);

  return (
    <div className="w-full aspect-[4/3] rounded-md border border-slate-700 bg-slate-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full"
      />
    </div>
  );
}
