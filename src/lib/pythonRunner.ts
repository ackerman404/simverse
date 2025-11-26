import { computeFrontDistance, type WorldGeometry } from "../sim/sensors";
import type { RobotPrimitive, RobotPose } from "./programTypes";

// Declare Skulpt global
declare const Sk: any;

export interface RobotCommand {
  op: string;
  arg: number;
}

// We'll keep this for backward compatibility if needed, but runPython is the main entry
export function extractCommands(code: string): RobotCommand[] {
  return [];
}

export async function runPython(
  code: string,
  world: WorldGeometry,
  startPose: RobotPose = { x: 0, y: 0, theta: 0 }
): Promise<RobotPrimitive[]> {
  const primitives: RobotPrimitive[] = [];

  // Track pose for sensors
  let currentPose = { ...startPose };

  // Helper to update pose based on drive command
  const updatePose = (v: number, w: number, dt: number) => {
    // Simple Euler integration for the runner's internal state
    // This needs to match trajectory.ts logic roughly
    if (w === 0) {
      currentPose.x += v * Math.cos(currentPose.theta) * dt;
      currentPose.y += v * Math.sin(currentPose.theta) * dt;
    } else {
      // For turns, we just update theta (in place rotation)
      currentPose.theta += w * dt;
    }
  };

  // Define built-ins
  const builtins = {
    move_forward: (dist: number) => {
      const d = Number(dist);
      const v = 0.25;
      const duration = Math.abs(d / v);
      const speed = d >= 0 ? v : -v;

      primitives.push({ type: "drive", v: speed, w: 0, duration });
      updatePose(speed, 0, duration);
    },
    turn_left: (angleDeg: number) => {
      const deg = Number(angleDeg);
      const wDeg = 45;
      const wRad = (wDeg * Math.PI) / 180;
      const duration = Math.abs(deg / wDeg);
      const w = deg >= 0 ? wRad : -wRad; // Left is positive w

      primitives.push({ type: "drive", v: 0, w, duration });
      updatePose(0, w, duration);
    },
    turn_right: (angleDeg: number) => {
      const deg = Number(angleDeg);
      const wDeg = 45;
      const wRad = (wDeg * Math.PI) / 180;
      const duration = Math.abs(deg / wDeg);
      const w = deg >= 0 ? -wRad : wRad; // Right is negative w

      primitives.push({ type: "drive", v: 0, w, duration });
      updatePose(0, w, duration);
    },
    get_front_distance: () => {
      return computeFrontDistance(currentPose, world);
    },
    set_pose: (x: number, y: number, thetaDeg: number) => {
      const theta = (Number(thetaDeg) * Math.PI) / 180;
      currentPose = { x: Number(x), y: Number(y), theta };
      primitives.push({ type: "set_pose", pose: { ...currentPose } });
    }
  };

  return new Promise((resolve, reject) => {
    // We need to configure Skulpt
    Sk.configure({
      output: (text: string) => console.log("Python stdout:", text),
      read: (fname: string) => {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][fname] === undefined)
          throw "File not found: " + fname;
        return Sk.builtinFiles["files"][fname];
      },
      // Inject our built-ins
      __future__: Sk.python3,
    });

    // We need to inject functions into the global scope of the execution
    // Skulpt is a bit tricky with custom builtins. 
    // The easiest way is to wrap the user code with our definitions or use Sk.builtins.

    // Let's define a wrapper that exposes these functions
    Sk.builtins["move_forward"] = (d: any) => {
      builtins.move_forward(Sk.ffi.remapToJs(d));
      return Sk.builtin.none.none$;
    };
    Sk.builtins["turn_left"] = (a: any) => {
      builtins.turn_left(Sk.ffi.remapToJs(a));
      return Sk.builtin.none.none$;
    };
    Sk.builtins["turn_right"] = (a: any) => {
      builtins.turn_right(Sk.ffi.remapToJs(a));
      return Sk.builtin.none.none$;
    };
    Sk.builtins["get_front_distance"] = () => {
      const d = builtins.get_front_distance();
      return new Sk.builtin.float_(d);
    };
    Sk.builtins["set_pose"] = (x: any, y: any, t: any) => {
      builtins.set_pose(Sk.ffi.remapToJs(x), Sk.ffi.remapToJs(y), Sk.ffi.remapToJs(t));
      return Sk.builtin.none.none$;
    };

    // Define the module with our custom built-ins
    const myPromise = Sk.misceval.asyncToPromise(() => {
      return Sk.importMainWithBody("<stdin>", false, code, true);
    });

    myPromise.then(
      () => resolve(primitives),
      (err: any) => reject(err.toString())
    );
  });
}

