# Simverse – Rover Builder Path (Season 1)

Goal: Build a web-based robotics learning experience for kids (10–16).
Stack: React + TypeScript + existing UAIbotJS-based simulator.

We are now implementing **Mission 1 – Wake Prototype R-0** as a full end-to-end challenge:

- Robot: Prototype R-0 (simple differential drive, no sensors yet).
- World: Hangar + TEST PAD.
- Player task: Change movement commands in code to drive R-0 from hangar to test pad.
- Concepts: forward(distance), turn_left/turn_right(angle), edit→run→tweak loop.
- Reward: Unlock "Rover Chassis & Wheels" and mark Movement as "online" in Rover Blueprint.

We already have:
- A working simulator component (UAIbotView) that can render a robot and world.
- A main React app shell.

We want:
1. A Mission 1 page/layout:
   - Left: code editor with starter code for Mission 1
   - Right: simulation view for Mission 1 world
   - Top bar: mission title and status
   - Rover blueprint strip with Movement highlighted

2. A "Run Code" button that:
   - Sends the code to our existing Python/sim harness (or a placeholder function),
   - Receives success/failure for Mission 1,
   - Triggers Mission Complete modal on success.

3. Non-destructive changes:
   - Reuse existing components where possible.
   - Add new React components instead of rewriting the whole app.



New requirement: Teaching / Lab Debrief stage

After a mission is successfully completed (Mission Complete modal shown), the user should go into a "Teaching stage" (Lab Debrief) for that mission.

For Mission 1 (Movement system), the Teaching stage should:

- Recap what the player did in kid-friendly language.
- Explain the core concept: Movement = distances + turning.
- Include one small interactive question (MCQ) to reinforce the idea.
- Tie this concept to the Rover Blueprint (Movement system online).
- On completion, mark a "debrief complete" flag for that mission and return to mission select / main view.

This Teaching stage should be implemented in a reusable way:
- We should be able to define teaching content per mission in `missions.ts`.
- A generic `TeachingStage` React component should render the teaching UI given a mission's teaching config.
- `App.tsx` should manage a new piece of state to show/hide the Teaching stage after Mission Complete.

