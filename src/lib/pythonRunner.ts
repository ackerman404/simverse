export type RobotCommand =
  | { op: "move_forward"; arg: number }
  | { op: "turn_left"; arg: number }
  | { op: "turn_right"; arg: number };

export function extractCommands(code: string): RobotCommand[] {
  const cmds: RobotCommand[] = [];
  const lines = code.split("\n");

  for (const raw of lines) {
    const line = raw.trim();

    // Match lines like:
    // move_forward(1.0)
    // turn_left(90)
    // turn_right(45.5)
    const match = line.match(
      /^(move_forward|turn_left|turn_right)\s*\(\s*([-+]?[0-9]*\.?[0-9]+)\s*\)\s*$/
    );

    if (!match) continue;

    const [, op, argStr] = match;
    const arg = Number(argStr);
    if (Number.isNaN(arg)) continue;

    cmds.push({ op: op as RobotCommand["op"], arg });
  }

  return cmds;
}
