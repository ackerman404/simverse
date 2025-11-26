import { extractCommands } from "./src/lib/pythonRunner";

const code = `def main():
    move_forward(3.25)
    turn_left(90)
    move_forward(1.75)
main()`;

const cmds = extractCommands(code);
console.log("Commands found:", cmds.length);
console.log(JSON.stringify(cmds, null, 2));
