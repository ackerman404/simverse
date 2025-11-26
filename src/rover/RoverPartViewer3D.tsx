import { useEffect, useRef, useState } from "react";

interface RoverPartViewer3DProps {
    movementConfig: {
        color: string;
        wheelScale: number;
    };
    introSpin?: boolean;
    pulse?: boolean;
}

interface UAIbotState {
    UAIbot: any;
    sim: any;
    chassis: any;
    wheels: any[];
    Utils: any;
    math: any;
}

export function RoverPartViewer3D({ movementConfig, introSpin = false, pulse = false }: RoverPartViewer3DProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef<UAIbotState & { config: { color: string; wheelScale: number } } | null>(null);
    const pulseStartTimeRef = useRef<number | null>(null);
    const introStartTimeRef = useRef<number | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Trigger pulse
    useEffect(() => {
        if (pulse) {
            pulseStartTimeRef.current = performance.now();
        }
    }, [pulse]);

    // Trigger Intro
    useEffect(() => {
        if (introSpin) {
            introStartTimeRef.current = performance.now();
        } else {
            introStartTimeRef.current = null;
        }
    }, [introSpin]);

    // Initialize Scene
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            if (!canvasRef.current) return;

            if (!stateRef.current) {
                try {
                    // Load libraries
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

                    // Ensure the canvas is in the DOM
                    if (!document.getElementById("scene")) {
                        console.error("[RoverPartViewer3D] Canvas element with id='scene' not found!");
                        return;
                    }

                    const sim = new UAIbot.Simulation();

                    // Zoom in: Adjust camera position if possible
                    // UAIbot usually exposes the Three.js camera via sim.camera or sim.scene.camera
                    if (sim.camera) {
                        // Default is usually around 3-5 units away. Let's move closer.
                        // Assuming Z-up or Y-up, we want to be close to [0,0,0]
                        sim.camera.position.set(0.4, -0.4, 0.3);
                        sim.camera.lookAt(0, 0, 0);
                    }

                    // 1. Chassis (Orange Box)
                    const chassis = new UAIbot.Box(0.2, 0.1, 0.05, "orange");
                    sim.add(chassis);

                    // Position chassis slightly up
                    const pos0 = math.matrix([[0], [0], [0.05]]);
                    chassis.setHTM(Utils.trn(pos0));

                    // 2. Create Wheels ONCE with default size (scale=1)
                    // We will scale them dynamically in the loop
                    const wheels: any[] = [];
                    const baseRadius = 0.04;
                    const baseWidth = 0.02;
                    const xOff = 0.08;
                    const yOff = 0.06;
                    const zCenter = 0.05;

                    const positions = [
                        [xOff, yOff],   // FL
                        [xOff, -yOff],  // FR
                        [-xOff, yOff],  // BL
                        [-xOff, -yOff]  // BR
                    ];

                    positions.forEach(([x, y]) => {
                        // Default color white, we'll tint it immediately
                        let wheel;
                        try {
                            // Cylinder(radius, height, color)
                            wheel = new UAIbot.Cylinder(baseRadius, baseWidth, "white");
                        } catch {
                            wheel = new UAIbot.Box(baseRadius * 2, baseWidth, baseRadius * 2, "white");
                        }
                        sim.add(wheel);
                        wheels.push(wheel);
                    });

                    stateRef.current = {
                        UAIbot,
                        sim,
                        chassis,
                        wheels,
                        Utils,
                        math,
                        config: movementConfig // Initial config
                    };

                    // Animation state
                    const duration = 1200; // 1.2s

                    // Animation loop for orbit controls + intro
                    sim.setAnimationLoop(() => {
                        const state = stateRef.current;
                        if (!state) {
                            sim.render();
                            return;
                        }

                        const { chassis, wheels, Utils, math, config } = state;
                        const now = performance.now();

                        // Calculate global scale factors
                        let animScale = 1.0;
                        let animAngle = 0;

                        // 1. Intro Animation
                        if (introStartTimeRef.current !== null) {
                            const elapsed = now - introStartTimeRef.current;
                            if (elapsed < duration) {
                                const t = elapsed / duration;
                                // Ease out cubic
                                const ease = 1 - Math.pow(1 - t, 3);
                                animAngle = ease * Math.PI * 2;

                                // Scale: 0.6 -> 1.05 -> 1.0
                                if (t < 0.8) {
                                    const st = t / 0.8;
                                    const sEase = 1 - Math.pow(1 - st, 3);
                                    animScale = 0.6 + (1.05 - 0.6) * sEase;
                                } else {
                                    const st = (t - 0.8) / 0.2;
                                    animScale = 1.05 - (0.05) * st;
                                }
                            }
                        }

                        // 2. Pulse Animation (additive to scale)
                        let pulseScale = 0;
                        if (pulseStartTimeRef.current !== null) {
                            const elapsed = now - pulseStartTimeRef.current;
                            const pDuration = 300; // 300ms pulse
                            if (elapsed < pDuration) {
                                const t = elapsed / pDuration;
                                // Sine wave bump: 0 -> 1 -> 0
                                pulseScale = Math.sin(t * Math.PI) * 0.08;
                            } else {
                                pulseStartTimeRef.current = null;
                            }
                        }

                        // Apply transforms

                        // Chassis: Only affected by Intro Animation
                        const chassisScale = animScale;
                        const chassisScaleMat = math.diag([chassisScale, chassisScale, chassisScale, 1]);
                        const chassisRotMat = Utils.rotz(animAngle);
                        const chassisPosMat = Utils.trn(math.matrix([[0], [0], [0.05]]));
                        // Order: Scale -> Rotate -> Translate
                        const chassisHTM = math.multiply(chassisPosMat, math.multiply(chassisRotMat, chassisScaleMat));
                        chassis.setHTM(chassisHTM);

                        // Wheels: Affected by Intro + Pulse + Config.WheelScale
                        // Total Wheel Scale = IntroScale * (1 + Pulse) * ConfigScale
                        const totalWheelScale = animScale * (1.0 + pulseScale) * config.wheelScale;

                        // Wheel Position: Must be scaled by IntroScale (to stay attached to chassis)
                        // But NOT by wheelScale (wheels grow in place)
                        const posScale = animScale;

                        const wheelScaleMat = math.diag([totalWheelScale, totalWheelScale, totalWheelScale, 1]);

                        wheels.forEach((wheel: any, i: number) => {
                            if (i >= positions.length) return;
                            const [wx, wy] = positions[i];

                            // 1. Scale position by Intro Scale
                            const wx_s = wx * posScale;
                            const wy_s = wy * posScale;

                            // 2. Rotate position by Intro Angle
                            const rx = wx_s * Math.cos(animAngle) - wy_s * Math.sin(animAngle);
                            const ry = wx_s * Math.sin(animAngle) + wy_s * Math.cos(animAngle);

                            // 3. Wheel Orientation: RotZ(IntroAngle) * RotX(90)
                            const wheelRot = math.multiply(Utils.rotz(animAngle), Utils.rotx(Math.PI / 2));

                            // 4. Combine
                            const pos = math.matrix([[rx], [ry], [zCenter]]);
                            const htm = math.multiply(
                                Utils.trn(pos),
                                math.multiply(wheelRot, wheelScaleMat)
                            );

                            wheel.setHTM(htm);
                        });

                        sim.render();
                    });

                    setInitialized(true);

                } catch (err) {
                    console.error("[RoverPartViewer3D] Error initializing:", err);
                }
            }
        };

        void init();

        return () => {
            cancelled = true;
            // Cleanup simulation to prevent context loss or event listener buildup
            if (stateRef.current && stateRef.current.sim) {
                // Try to dispose if method exists, otherwise just nullify
                // UAIbot doesn't have a standard dispose documented here, but we can try to stop the loop
                try {
                    stateRef.current.sim.setAnimationLoop(null);
                } catch (e) { /* ignore */ }
                stateRef.current = null;
                setInitialized(false);
            }
        };
    }, []);

    // Update Config (Color & Scale state)
    useEffect(() => {
        const state = stateRef.current;
        if (!state || !initialized) return;

        // Update config in state for the loop to pick up scale
        state.config = movementConfig;

        // Update Color directly on meshes
        state.wheels.forEach((w: any) => {
            // Try to find the mesh and update material color
            const mesh = w.shape || w.mesh || w.ref || w.object3D || w._mesh;
            if (mesh && mesh.material) {
                // Three.js material color
                if (mesh.material.color && typeof mesh.material.color.set === 'function') {
                    mesh.material.color.set(movementConfig.color);
                }
            }
        });

    }, [movementConfig, initialized]);

    return (
        <div className="w-full h-full rounded-md border border-slate-700 bg-black/80 relative overflow-hidden">
            <canvas
                ref={canvasRef}
                id="scene"
                className="w-full h-full block"
            />
            <div className="absolute bottom-2 right-2 text-[0.6rem] text-slate-500">
                Drag to rotate
            </div>
        </div>
    );
}
