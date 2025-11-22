import { useEffect, useRef } from "react";
import type { RobotCommand } from "../lib/pythonRunner";
import type { WorldConfig } from "../missions";
import type { RobotPrimitive } from "../lib/programTypes";

interface SimulatorViewProps {
  commands: RobotCommand[];
  program: RobotPrimitive[]; // not used yet, but threaded through
  runId: number;
  world: WorldConfig;
  onResult?: (success: boolean) => void;
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
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

const SCALE = 80; // 1.0 "meter" = 80 px

export function SimulatorView({
  commands,
  program, // currently unused
  runId,
  world,
  onResult,
}: SimulatorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { start, goal, crater } = world;

    // Pre-generate stars so they don't flicker
    const stars: { x: number; y: number }[] = [];
    const groundTop = canvas.height * 0.55;
    for (let i = 0; i < 25; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * groundTop * 0.95,
      });
    }

    function drawBackground() {
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

      // Crater obstacle (optional)
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
    }

    function drawRover(ctx: CanvasRenderingContext2D, x: number, y: number, theta: number) {
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

    // --- 1) Handle "no commands" case ---
    if (!commands.length) {
      drawBackground();

      // Landing site
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Nova at start
      drawRover(ctx, start.x, start.y, start.theta);

      if (onResult) {
        onResult(false);
      }
      return;
    }

    // --- 2) Simulate path once (no continuous animation) ---
    let x = start.x;
    let y = start.y;
    let theta = start.theta;

    const path: { x: number; y: number }[] = [{ x, y }];

    for (const cmd of commands) {
      if (cmd.op === "move_forward") {
        const dx = cmd.arg * SCALE * Math.cos(theta);
        const dy = cmd.arg * SCALE * Math.sin(theta);
        x += dx;
        y -= dy; // canvas y is down
        path.push({ x, y });
      } else if (cmd.op === "turn_left") {
        theta += degToRad(cmd.arg);
      } else if (cmd.op === "turn_right") {
        theta -= degToRad(cmd.arg);
      }
    }

    // --- 3) Draw static scene with final path + pose ---
    function drawStaticScene() {
      drawBackground();

      // Path
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Landing site
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Final rover pose
      drawRover(ctx, x, y, theta);
    }

    // Check success
    const dxGoal = x - goal.x;
    const dyGoal = y - goal.y;
    const dist = Math.sqrt(dxGoal * dxGoal + dyGoal * dyGoal);
    const success = dist <= goal.r;

    // Notify parent once
    if (onResult) {
      onResult(success);
    }

    // --- 4) If fail: just draw static scene ---
    if (!success) {
      drawStaticScene();
    } else {
      // --- 5) If success: play a short "achievement" pulse animation around the beacon ---
      const totalDuration = 1200; // ms
      let startTime: number | null = null;

      function animate(t: number) {
        if (startTime === null) startTime = t;
        const elapsed = t - startTime;
        const progress = Math.min(1, elapsed / totalDuration);

        // Base scene
        drawStaticScene();

        // Pulsing rings around beacon
        const numRings = 3;
        for (let i = 0; i < numRings; i++) {
          const phase = progress * (numRings + 1) - i;
          if (phase < 0 || phase > 1) continue;

          const radius = goal.r + phase * 28;
          const alpha = 1 - phase;

          ctx.beginPath();
          ctx.arc(goal.x, goal.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34,197,94,${alpha * 0.7})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Little sparkle at the rover when success
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, -18, 3 + 2 * Math.sin(progress * Math.PI), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(248,250,252,0.9)";
        ctx.fill();
        ctx.restore();

        if (elapsed < totalDuration) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Final static draw
          drawStaticScene();
        }
      }

      // Kick off the achievement animation
      drawStaticScene();
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
