import commander from "commander";
import { addCompletionSpecCommand } from "../../../src";

const program = new commander.Command();

program
  .option("-c, --color <type>", "specify the color", "blue")
  .addOption(new commander.Option("-n, --number <type>").default(1))
  .addOption(new commander.Option("-a, --arr <type>").default([1, 2, 3]));

addCompletionSpecCommand(program);
program.parse(process.argv);
