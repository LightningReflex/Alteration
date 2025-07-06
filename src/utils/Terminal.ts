import chalk from "chalk";
import * as readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export class Terminal {
    public static input(prompt: string, defaultValue?: string): Promise<string> {
        return new Promise((resolve) => {
            const question = `${chalk.gray("[")}${chalk.blue("?")}${chalk.gray("]")} ${chalk.white(prompt)}`;
            const defaultPrompt = defaultValue ? ` [${chalk.gray(defaultValue)}]` : "";
            const formattedPrompt = `${question}${defaultPrompt}\n${chalk.white("> ")}`;
            rl.question(formattedPrompt, (answer) => {
                resolve(answer || defaultValue || "");
                rl.close();
            });
        });
    }
}