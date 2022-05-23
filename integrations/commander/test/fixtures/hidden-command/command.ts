import commander from "commander";
import { addCompletionSpecCommand } from "../../../src";

const program = new commander.Command();

program
  .command("build", {
    hidden: true,
  })
  .description("build web site for deployment");

program.command("deploy").description("deploy web site to production");

program
  .command("serve", { isDefault: true })
  .description("launch web server")
  .option("-p,--port <port_number>", "web port");

addCompletionSpecCommand(program);
program.parse(process.argv);
