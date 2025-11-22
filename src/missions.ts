export interface WorldConfig {
  start: { x: number; y: number; theta: number };
  goal: { x: number; y: number; r: number };
  crater?: { x: number; y: number; rx: number; ry: number };
}

export interface Mission {
  id: string;
  planet: string;
  index: number;
  title: string;
  shortName: string; // e.g. "Mission 01"
  briefing: string;
  defaultCode: string;
  world: WorldConfig;
}

export const MISSIONS: Mission[] = [
  {
    id: "exo1-m1",
    planet: "Exo-1",
    index: 1,
    title: "Reach the Beacon",
    shortName: "Mission 01",
    briefing:
      "Nova has just landed on Planet Exo-1. Drive straight across the plain, turn toward the beacon, and reach it to calibrate Nova's sensors.",
    defaultCode: `# Planet Exo-1 · Mission 01: Reach the Beacon
# Use move_forward(distance_m), turn_left(angle_deg), turn_right(angle_deg).

# Hint: Nova starts at the landing site on the left.
# First drive across the plain, then turn toward the beacon and drive up.

def main():
    move_forward(3.25)
    turn_left(90)
    move_forward(1.75)

main()
`,
    world: {
      start: { x: 80, y: 260, theta: 0 },
      goal: { x: 340, y: 120, r: 35 },
      crater: { x: 260, y: 228, rx: 60, ry: 22 },
    },
  },
  {
    id: "exo1-m2",
    planet: "Exo-1",
    index: 2,
    title: "Distant Beacon",
    shortName: "Mission 02",
    briefing:
      "The second beacon is farther away on Exo-1. Adjust your route so Nova can reach the distant signal without getting lost.",
    defaultCode: `# Planet Exo-1 · Mission 02: Distant Beacon
# Make Nova reach the farther beacon on the right.

def main():
    # This is a starting guess. Modify the distances/turns
    # until Nova reaches the beacon.
    move_forward(3.5)
    turn_left(90)
    move_forward(2.0)

main()
`,
    world: {
      start: { x: 80, y: 260, theta: 0 },
      goal: { x: 400, y: 110, r: 35 },
      crater: { x: 260, y: 228, rx: 60, ry: 22 },
    },
  },
];
