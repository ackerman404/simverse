import type { Obstacle } from "./sim/sensors";

export interface WorldConfig {
  start: { x: number; y: number; theta: number };
  goal: { x: number; y: number; r: number };
  crater?: { x: number; y: number; rx: number; ry: number };
  obstacles?: Obstacle[];
}

export interface TeachingConfig {
  recapText: string;
  conceptTitle: string;
  conceptText?: string; // Made optional as we might use conceptBlocks instead
  conceptBlocks?: { title: string; text: string[] }[];
  poseTable?: { step: number; command: string; poseBefore: string; poseAfter: string }[];
  moves?: string[];
  question?: {
    text: string;
    options: string[];
    correctIndex: number;
    feedbackCorrect: string;
    feedbackIncorrect: string;
  };
  challengePrompt?: {
    title: string;
    text: string;
    buttonText: string;
  };
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
  teaching?: TeachingConfig;
  challenge?: {
    beacon: { x: number; y: number; r: number };
    title: string;
    description: string;
    starterComments: string;
  };
}

export const MISSIONS: Mission[] = [
  {
    id: "exo1-m1",
    planet: "Exo-1",
    index: 1,
    title: "Nova's First Coordinates",
    shortName: "Mission 01",
    briefing:
      "Nova has landed on Planet Exo-1 and needs to reach a calibration beacon on a coordinate grid. You control Nova using straight moves and turns.\n\nNova starts at the origin (0.00, 0.00) facing 0° (Right). The beacon is at (3.25, 1.75). Avoid the crater!",
    defaultCode: `# Planet Exo-1 · Mission 01: Nova's First Coordinates
# Use move_forward(distance_m), turn_left(angle_deg), turn_right(angle_deg).

# Hint: Nova starts at (0, 0) facing 0° (Right).
# The beacon is at (3.25, 1.75).

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
    teaching: {
      recapText:
        "Nova started at (0.00, 0.00, 0°) and ended at the beacon at (3.25, 1.75, 90°).",
      conceptTitle: "Mission Debrief – Coordinate Lab",
      poseTable: [
        { step: 0, command: "(start)", poseBefore: "-", poseAfter: "(0.00, 0.00, 0°)" },
        { step: 1, command: "move_forward(3.25)", poseBefore: "(0.00, 0.00, 0°)", poseAfter: "(3.25, 0.00, 0°)" },
        { step: 2, command: "turn_left(90)", poseBefore: "(3.25, 0.00, 0°)", poseAfter: "(3.25, 0.00, 90°)" },
        { step: 3, command: "move_forward(1.75)", poseBefore: "(3.25, 0.00, 90°)", poseAfter: "(3.25, 1.75, 90°)" },
      ],
      conceptBlocks: [
        {
          title: "Coordinates (X, Y)",
          text: [
            "The map is a coordinate plane.",
            "Each point is (x, y): x is left/right, y is up/down from the origin.",
            "Nova started at (0, 0). After the first move, it was at (3.25, 0). The beacon is at (3.25, 1.75)."
          ]
        },
        {
          title: "Angles / Heading (θ)",
          text: [
            "Nova also tracks its heading angle θ in degrees.",
            "0° = facing right, 90° = up, 180° = left, 270° = down.",
            "move_forward(d) moves along the current θ.",
            "turn_left(90) adds 90° to θ (counterclockwise)."
          ]
        }
      ],
      challengePrompt: {
        title: "Training Complete",
        text: "You've seen how coordinates work. Now prove your mastery by writing the program from scratch.",
        buttonText: "Start Mission Challenge"
      }
    },
    challenge: {
      beacon: { x: 340, y: 120, r: 35 }, // (3.25, 1.75) - Same as training for reinforcement
      title: "Mission 01 – Live Run",
      description: "Reconstruct the flight path on your own.",
      starterComments: `# Mission 01 – Live Run
# Goal: Move Nova from (0, 0) to the beacon at (3.25, 1.75).
#
# You can use:
#   move_forward(distance)
#   turn_left(angle_degrees)
#   turn_right(angle_degrees)
#
# Write your code below this line:
`
    },
  },
  {
    id: "sensor_stop",
    planet: "Exo-1",
    index: 2,
    title: "Front Sensor Lab",
    shortName: "Mission 02",
    briefing:
      "Drive forward until Nova is safely close to the wall using get_front_distance().",
    defaultCode: `# Planet Exo-1 · Mission 02: Front Sensor Lab
# Drive forward until Nova is about 0.5 m from the wall.

def main():
    set_pose(0, 0, 0)  # facing the wall

    # Hint: use get_front_distance() inside a loop.
    while True:
        d = get_front_distance()
        # print(d)   # uncomment to debug distances
        if d < 0.5:
            break
        move_forward(0.1)

main()
`,
    world: {
      start: { x: 0, y: 0, theta: 0 }, // Will be overridden by set_pose in code, but good default
      goal: { x: 2.5, y: 0, r: 0.5 }, // Goal area roughly where we want to stop
      obstacles: [
        {
          type: "rectangle",
          x: 3.0, // Wall at x=3.0
          y: 0,
          width: 0.2, // Thin wall
          height: 10.0 // Long wall
        }
      ]
    },
  },
];
