import { computeFrontDistance, type WorldGeometry } from "./src/sim/sensors";

const world: WorldGeometry = {
    obstacles: [
        { type: "circle", x: 3, y: 0, radius: 1 }, // Circle at x=3, r=1. Surface at x=2.
    ],
};

const pose1 = { x: 0, y: 0, theta: 0 }; // Facing East
const d1 = computeFrontDistance(pose1, world, 5.0);
console.log(`Test 1 (Hit): Expected ~2.0, Got ${d1}`);

const pose2 = { x: 0, y: 0, theta: Math.PI }; // Facing West
const d2 = computeFrontDistance(pose2, world, 5.0);
console.log(`Test 2 (Miss): Expected 5.0, Got ${d2}`);

const pose3 = { x: 0, y: 0, theta: 0.1 }; // Slight angle
const d3 = computeFrontDistance(pose3, world, 5.0);
console.log(`Test 3 (Angle): Got ${d3}`);
