import type { RobotPose } from "../lib/programTypes";

export interface Circle {
    type: "circle";
    x: number;
    y: number;
    radius: number;
}

export interface Rectangle {
    type: "rectangle";
    x: number; // Center x
    y: number; // Center y
    width: number;
    height: number;
}

export type Obstacle = Circle | Rectangle;

export interface WorldGeometry {
    obstacles: Obstacle[];
}

/**
 * Computes the distance to the closest obstacle directly in front of the robot.
 * @param pose Robot's current pose (x, y, theta).
 * @param world World geometry containing obstacles.
 * @param maxRange Maximum range of the sensor (default 5.0).
 * @returns Distance to the closest obstacle, or maxRange if none found.
 */
export function computeFrontDistance(
    pose: RobotPose,
    world: WorldGeometry,
    maxRange: number = 5.0
): number {
    const rayOrigin = { x: pose.x, y: pose.y };
    const rayDir = { x: Math.cos(pose.theta), y: Math.sin(pose.theta) };

    let minDist = maxRange;

    for (const obs of world.obstacles) {
        let dist: number | null = null;
        if (obs.type === "circle") {
            dist = intersectRayCircle(rayOrigin, rayDir, obs);
        } else if (obs.type === "rectangle") {
            dist = intersectRayRectangle(rayOrigin, rayDir, obs);
        }

        if (dist !== null && dist < minDist) {
            minDist = dist;
        }
    }

    return minDist;
}

/**
 * Computes a scan of distances spread over a field of view.
 * @param pose Robot's current pose.
 * @param world World geometry.
 * @param numBeams Number of beams to cast.
 * @param fovDeg Field of view in degrees.
 * @param maxRange Maximum range (default 5.0).
 * @returns Array of distances.
 */
export function computeScan(
    pose: RobotPose,
    world: WorldGeometry,
    numBeams: number,
    fovDeg: number,
    maxRange: number = 5.0
): number[] {
    const ranges: number[] = [];
    const halfFovRad = (fovDeg * Math.PI) / 180 / 2;
    const startAngle = pose.theta + halfFovRad;
    const endAngle = pose.theta - halfFovRad;

    // If numBeams is 1, just use center
    if (numBeams === 1) {
        ranges.push(computeFrontDistance(pose, world, maxRange));
        return ranges;
    }

    const angleStep = (endAngle - startAngle) / (numBeams - 1);

    for (let i = 0; i < numBeams; i++) {
        const angle = startAngle + i * angleStep;
        const rayDir = { x: Math.cos(angle), y: Math.sin(angle) };

        let minDist = maxRange;
        for (const obs of world.obstacles) {
            let dist: number | null = null;
            if (obs.type === "circle") {
                dist = intersectRayCircle({ x: pose.x, y: pose.y }, rayDir, obs);
            } else if (obs.type === "rectangle") {
                dist = intersectRayRectangle({ x: pose.x, y: pose.y }, rayDir, obs);
            }

            if (dist !== null && dist < minDist) {
                minDist = dist;
            }
        }
        ranges.push(minDist);
    }

    return ranges;
}

// --- Helpers ---

function intersectRayCircle(
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    circle: Circle
): number | null {
    // Vector from origin to circle center
    const L = { x: circle.x - origin.x, y: circle.y - origin.y };

    // Projection of L onto dir (t_ca)
    const t_ca = L.x * dir.x + L.y * dir.y;

    const d2 = (L.x * L.x + L.y * L.y) - (t_ca * t_ca);
    const r2 = circle.radius * circle.radius;

    if (d2 > r2) {
        return null; // Ray misses circle
    }

    const thc = Math.sqrt(r2 - d2);

    // Two intersection points along the line: t0 = t_ca - thc, t1 = t_ca + thc
    const t0 = t_ca - thc;
    const t1 = t_ca + thc;

    // We want the smallest positive t
    if (t0 > 0) return t0;
    if (t1 > 0) return t1; // Origin inside circle

    return null; // Circle behind ray
}

function intersectRayRectangle(
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    rect: Rectangle
): number | null {
    // Axis-aligned rectangle intersection (Slab method)
    // Rect bounds
    const minX = rect.x - rect.width / 2;
    const maxX = rect.x + rect.width / 2;
    const minY = rect.y - rect.height / 2;
    const maxY = rect.y + rect.height / 2;

    let tMin = -Infinity;
    let tMax = Infinity;

    // Check X slabs
    if (dir.x !== 0) {
        const tx1 = (minX - origin.x) / dir.x;
        const tx2 = (maxX - origin.x) / dir.x;
        tMin = Math.max(tMin, Math.min(tx1, tx2));
        tMax = Math.min(tMax, Math.max(tx1, tx2));
    } else if (origin.x < minX || origin.x > maxX) {
        return null; // Parallel and outside
    }

    // Check Y slabs
    if (dir.y !== 0) {
        const ty1 = (minY - origin.y) / dir.y;
        const ty2 = (maxY - origin.y) / dir.y;
        tMin = Math.max(tMin, Math.min(ty1, ty2));
        tMax = Math.min(tMax, Math.max(ty1, ty2));
    } else if (origin.y < minY || origin.y > maxY) {
        return null; // Parallel and outside
    }

    if (tMax < tMin) return null; // No intersection
    if (tMax < 0) return null; // Rectangle behind ray

    // If tMin > 0, it's the first intersection
    if (tMin > 0) return tMin;

    // If tMin < 0 and tMax > 0, origin is inside
    return tMax; // Or 0? Usually sensors return 0 if inside.
}
