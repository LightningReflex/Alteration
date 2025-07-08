import chalk from "chalk";
import * as readline from "readline";

export class Terminal {
    public static input(prompt: string, defaultValue?: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = `${chalk.gray("[")}${chalk.blue("?")}${chalk.gray("]")} ${chalk.white(prompt)}`;
        const defaultPrompt = defaultValue ? ` [${chalk.gray(defaultValue)}]` : "";
        const formattedPrompt = `${question}${defaultPrompt}\n${chalk.white("> ")}`;
        return new Promise((resolve) => {
            rl.question(formattedPrompt, (answer) => {
                rl.close();
                resolve(answer || defaultValue || "");
            });
        });
    }
}