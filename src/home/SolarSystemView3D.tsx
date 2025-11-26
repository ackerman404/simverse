import { useEffect, useRef, useState } from "react";
import type { Mission } from "../missions";

interface SolarSystemView3DProps {
    missions: Mission[];
    selectedMissionId: string | null;
    onSelectMission: (id: string) => void;
    completedMissions?: Record<string, boolean>;
}

interface PlanetData {
    obj: any;
    missionId: string;
    orbitRadius: number;
    orbitSpeed: number;
    angle: number;
    size: number;
    mission: Mission;
}

interface UAIbotState {
    sim: any;
    star: any;
    planets: PlanetData[];
    backgroundStars: any[];
    Utils: any;
    math: any;
    THREE: any;
}

export function SolarSystemView3D({
    missions,
    selectedMissionId,
    onSelectMission,
    completedMissions = {}
}: SolarSystemView3DProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef<UAIbotState | null>(null);
    const [planetPositions, setPlanetPositions] = useState<Record<string, { x: number; y: number }>>({});

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

                    if (!document.getElementById("scene")) {
                        console.error("[SolarSystemView3D] Canvas element not found!");
                        return;
                    }

                    const sim = new UAIbot.Simulation();

                    // Clear any default objects (e.g., grid floor) that UAIbot may add
                    if (sim.scene && sim.scene.children) {
                        sim.scene.children.slice().forEach((child: any) => sim.scene.remove(child));
                    }
                    // Dynamically import Three.js library
                    const threeModule = await import(
                        "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js"
                    );
                    const THREE = threeModule;
                    if (!THREE) {
                        console.error("[SolarSystemView3D] THREE.js failed to load!");
                        return;
                    }

                    // Set dark space background
                    if (sim.scene && THREE) {
                        sim.scene.background = new THREE.Color(0x0a0a0f);
                    }

                    // Camera setup - isometric-style view from above
                    if (sim.camera) {
                        sim.camera.position.set(8, -12, 10);
                        sim.camera.lookAt(0, 0, 0);
                    }

                    // Lighting
                    if (sim.scene && THREE) {
                        // Ambient light (low intensity)
                        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
                        sim.scene.add(ambientLight);

                        // Point light at star position
                        const starLight = new THREE.PointLight(0xfff4e6, 2, 50);
                        starLight.position.set(0, 0, 0);
                        sim.scene.add(starLight);
                    }

                    // 1. Central Star with emissive glow
                    let star: any;
                    if (sim.scene && THREE) {
                        const starGeometry = new THREE.SphereGeometry(0.8, 32, 32);
                        const starMaterial = new THREE.MeshStandardMaterial({
                            color: 0xfff4e6,
                            emissive: 0xffaa00,
                            emissiveIntensity: 1.5,
                        });
                        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
                        sim.scene.add(starMesh);
                        star = { mesh: starMesh };
                    }

                    // 2. Background stars (small white spheres)
                    const backgroundStars: any[] = [];
                    if (sim.scene && THREE) {
                        for (let i = 0; i < 100; i++) {
                            const starSize = Math.random() * 0.05 + 0.02;
                            const starGeometry = new THREE.SphereGeometry(starSize, 8, 8);
                            const starMaterial = new THREE.MeshBasicMaterial({
                                color: 0xffffff,
                                transparent: true,
                                opacity: Math.random() * 0.5 + 0.3
                            });
                            const starMesh = new THREE.Mesh(starGeometry, starMaterial);

                            // Random position in a sphere around the scene
                            const theta = Math.random() * Math.PI * 2;
                            const phi = Math.random() * Math.PI;
                            const radius = 20 + Math.random() * 10;

                            starMesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
                            starMesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
                            starMesh.position.z = radius * Math.cos(phi);

                            sim.scene.add(starMesh);
                            backgroundStars.push(starMesh);
                        }
                    }

                    // 3. Planets
                    const planets: PlanetData[] = [];
                    const baseRadius = 3;
                    const spacing = 2.5;
                    const planetColors = ["#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f59e0b"];

                    missions.forEach((mission, i) => {
                        const isCompleted = completedMissions[mission.id];
                        const isLocked = false; // For now, all missions are unlocked

                        const size = 0.4 + (i * 0.1);
                        const color = isLocked ? 0x666666 : parseInt(planetColors[i % planetColors.length].replace('#', '0x'));

                        if (sim.scene && THREE) {
                            const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
                            const planetMaterial = new THREE.MeshStandardMaterial({
                                color: color,
                                emissive: isCompleted ? color : 0x000000,
                                emissiveIntensity: isCompleted ? 0.3 : 0,
                                roughness: 0.7,
                                metalness: 0.3,
                            });
                            const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
                            sim.scene.add(planetMesh);

                            // Add completion ring/halo for completed missions
                            if (isCompleted && sim.scene && THREE) {
                                const ringGeometry = new THREE.RingGeometry(size * 1.3, size * 1.5, 32);
                                const ringMaterial = new THREE.MeshBasicMaterial({
                                    color: color,
                                    side: THREE.DoubleSide,
                                    transparent: true,
                                    opacity: 0.4,
                                });
                                const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                                ringMesh.rotation.x = Math.PI / 2;
                                planetMesh.add(ringMesh);
                            }

                            planets.push({
                                obj: planetMesh,
                                missionId: mission.id,
                                orbitRadius: baseRadius + i * spacing,
                                orbitSpeed: 0.15 + (i * 0.03),
                                angle: (i * Math.PI * 2) / missions.length, // Evenly spaced initially
                                size: size,
                                mission: mission
                            });
                        }
                    });

                    stateRef.current = {
                        sim,
                        star,
                        planets,
                        backgroundStars,
                        Utils,
                        math,
                        THREE
                    };

                    // Animation Loop
                    sim.setAnimationLoop(() => {
                        const state = stateRef.current;
                        if (!state) {
                            sim.render();
                            return;
                        }

                        const { star, planets, THREE } = state;
                        const now = performance.now() / 1000;

                        // 1. Animate Star (gentle pulse)
                        if (star && star.mesh) {
                            const pulse = 1 + Math.sin(now * 1.5) * 0.08;
                            star.mesh.scale.set(pulse, pulse, pulse);
                            star.mesh.rotation.y = now * 0.2;
                        }

                        // 2. Animate Planets and track positions for labels
                        const newPositions: Record<string, { x: number; y: number }> = {};

                        planets.forEach((p: PlanetData) => {
                            // Orbit
                            p.angle += p.orbitSpeed * 0.008; // Slow, smooth orbit

                            const r = p.orbitRadius;
                            const x = r * Math.cos(p.angle);
                            const y = r * Math.sin(p.angle);
                            const z = Math.sin(p.angle * 2) * 0.3; // Slight vertical oscillation

                            // Selection highlight
                            const isSelected = p.missionId === selectedMissionId;
                            const targetScale = isSelected ? 1.4 : 1.0;

                            // Smooth scale transition
                            const currentScale = p.obj.scale.x;
                            const newScale = currentScale + (targetScale - currentScale) * 0.1;
                            p.obj.scale.set(newScale, newScale, newScale);

                            // Update position
                            p.obj.position.set(x, y, z);
                            p.obj.rotation.y = now * 0.5;
                            p.obj.rotation.x = now * 0.3;

                            // Add glow for selected planet
                            if (isSelected && p.obj.material) {
                                p.obj.material.emissiveIntensity = 0.5 + Math.sin(now * 3) * 0.2;
                            } else if (!completedMissions[p.missionId] && p.obj.material) {
                                p.obj.material.emissiveIntensity = 0;
                            }

                            // Project to screen space for labels
                            if (sim.camera && canvasRef.current && THREE) {
                                const vector = new THREE.Vector3(x, y, z + p.size * 1.5);
                                vector.project(sim.camera);

                                const canvas = canvasRef.current;
                                const widthHalf = canvas.clientWidth / 2;
                                const heightHalf = canvas.clientHeight / 2;

                                newPositions[p.missionId] = {
                                    x: (vector.x * widthHalf) + widthHalf,
                                    y: -(vector.y * heightHalf) + heightHalf
                                };
                            }
                        });

                        // Update positions for React labels (throttled)
                        if (Math.floor(now * 10) % 2 === 0) {
                            setPlanetPositions(newPositions);
                        }

                        sim.render();
                    });

                    // Click interaction using raycasting
                    const canvas = canvasRef.current;
                    if (canvas && sim.camera && sim.scene && THREE) {
                        const raycaster = new THREE.Raycaster();
                        const mouse = new THREE.Vector2();

                        canvas.onclick = (event) => {
                            const rect = canvas.getBoundingClientRect();
                            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                            raycaster.setFromCamera(mouse, sim.camera);

                            const state = stateRef.current;
                            if (!state) return;

                            const intersects = raycaster.intersectObjects(
                                state.planets.map(p => p.obj)
                            );

                            if (intersects.length > 0) {
                                const clickedPlanet = state.planets.find(
                                    p => p.obj === intersects[0].object
                                );
                                if (clickedPlanet) {
                                    onSelectMission(clickedPlanet.missionId);
                                }
                            }
                        };
                    }

                } catch (err) {
                    console.error("[SolarSystemView3D] Error initializing:", err);
                }
            }
        };

        void init();

        return () => {
            cancelled = true;
            if (stateRef.current && stateRef.current.sim) {
                try {
                    stateRef.current.sim.setAnimationLoop(null);
                } catch (e) { }
                stateRef.current = null;
            }
        };
    }, [missions, completedMissions]); // Re-init if missions change

    // Update selected mission in state
    useEffect(() => {
        if (stateRef.current) {
            // @ts-ignore
            stateRef.current.selectedMissionId = selectedMissionId;
        }
    }, [selectedMissionId]);

    return (
        <div className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                id="scene"
                className="w-full h-full block cursor-pointer"
            />

            {/* Planet Labels */}
            {Object.entries(planetPositions).map(([missionId, pos]) => {
                const planet = stateRef.current?.planets.find(p => p.missionId === missionId);
                if (!planet) return null;

                const isSelected = missionId === selectedMissionId;
                const isCompleted = completedMissions[missionId];

                return (
                    <div
                        key={missionId}
                        className={`absolute pointer-events-none transition-all duration-200 ${isSelected ? 'scale-110' : ''
                            }`}
                        style={{
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <div className={`px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm border ${isSelected
                            ? 'bg-white/20 border-white/40 text-white shadow-lg'
                            : isCompleted
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
                            }`}>
                            M{planet.mission.index}
                            {isCompleted && <span className="ml-1">✓</span>}
                        </div>
                    </div>
                );
            })}

            <div className="absolute bottom-4 left-4 text-[0.65rem] text-slate-500 bg-slate-900/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-800">
                Click planets to select • Drag to rotate
            </div>
        </div>
    );
}
