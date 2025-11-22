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
