import { useEffect, useRef } from "react";
import type { WorldConfig } from "../missions";
import type { RobotPrimitive } from "../lib/programTypes";
import { buildTrajectory, type PoseSample } from "../lib/trajectory";

interface UAIbotViewProps {
  world: WorldConfig;
  program: RobotPrimitive[];
  runId: number;
}

interface UAIbotState {
  sim: any;
  rover: any;
  Utils: any;
  math: any;
  trajectory: PoseSample[];
  stepIndex: number;
}

export function UAIbotView({ world, program, runId }: UAIbotViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<UAIbotState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!canvasRef.current) return;

      // First-time setup: load libs and create scene
      if (!stateRef.current) {
        try {
          const UAIbot: any = await import(
            "https://cdn.jsdelivr.net/gh/UAIbot/UAIbotJS@v1.0.1/UAIbotJS/UAIbot.js"
          );
          const Utils: any = await import(
            "https://cdn.jsdelivr.net/gh/UAIbot/UAIbotJS@main/UAIbotJS/Utils.js"
          );
          const math: any = await import(
            "https://cdn.jsdelivr.net/npm/mathjs@11.6.0/+esm"
          );

          if (cancelled) return;

          const sim = new UAIbot.Simulation();

          // Simple orange box as Nova rover
          const rover = new UAIbot.Box(0.2, 0.1, 0.05, "orange");
          sim.add(rover);

          // Starting pose at origin, slightly above ground
          const pos0 = math.matrix([[0], [0], [0.05]]);
          const htm0 = Utils.trn(pos0);
          rover.setHTM(htm0);

          const initialTrajectory: PoseSample[] = buildTrajectory(program);

          stateRef.current = {
            sim,
            rover,
            Utils,
            math,
            trajectory: initialTrajectory,
            stepIndex: 0,
          };

          // Animation: advance one trajectory sample per frame
          sim.setAnimationLoop(() => {
            const state = stateRef.current;
            if (!state) {
              sim.render();
              return;
            }

            const { rover, Utils, math, trajectory } = state;
            if (!trajectory.length) {
              sim.render();
              return;
            }

            // Clamp index
            if (state.stepIndex >= trajectory.length) {
              state.stepIndex = trajectory.length - 1;
            }

            const sample = trajectory[state.stepIndex];

            // Map (x, y, theta) → 3D pose
            const pos = math.matrix([[sample.x], [sample.y], [0.05]]);
            const Ttrn = Utils.trn(pos);              // translation
            const Trot = Utils.rotz(sample.theta);    // rotation about Z
            const htm = state.math.multiply(Ttrn, Trot);

            rover.setHTM(htm);

            // Advance to next step for next frame (until the end)
            if (state.stepIndex < trajectory.length - 1) {
              state.stepIndex += 1;
            }

            sim.render();
          });
        } catch (err) {
          console.error("[UAIbotView] Error initializing UAIbotJS:", err);
          return;
        }
      }

      // Each new run: rebuild trajectory and reset stepIndex
      if (stateRef.current) {
        stateRef.current.trajectory = buildTrajectory(program);
        stateRef.current.stepIndex = 0;
        console.log("[UAIbotView] new run", {
          world,
          program,
          runId,
          samples: stateRef.current.trajectory.length,
        });
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [world, program, runId]);

  return (
    <div className="w-full aspect-[4/3] mt-2 rounded-md border border-slate-700 bg-black/80 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        id="scene"
        className="w-full h-full"
      />
      {!program.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[0.7rem] text-slate-300">
          UAIbotJS: 3D rover (waiting for program)
        </div>
      )}
    </div>
  );
}
