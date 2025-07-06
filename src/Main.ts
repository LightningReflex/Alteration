import mc from "minecraft-protocol";
import mineflayer from "mineflayer";
import logger from "./utils/Logger";
import { Terminal } from "./utils/Terminal";
import chalk from "chalk";

export class Main {
    public static async main(): Promise<void> {
        logger.info("Starting the bot...");
        // const test = await Terminal.input("What account would you like to log in with (email)?")
        let email;
        do {
            email = await Terminal.input("What account would you like to log in with (email)?");
            if (!email) {
                logger.warn("Email cannot be empty. Please try again.");
            }
        } while (!email);
        logger.info(`Logging in with account: ${email}`);
        const bot = mineflayer.createBot({
            host: "minehut.com",
            username: email,
            auth: "microsoft",
            onMsaCode: (code) => {
                logger.info("Please enter the following code in your browser to authenticate:");
                logger.info(code);
            },
            profilesFolder: "../profiles",
        });
        bot.on("spawn", () => {
            console.log("Bot has spawned in the game.");
            bot.entity.position = bot.entity.position || { x: 0, y: 0, z: 0 };
            logger.info(`Bot position: ${bot.entity.position.x}, ${bot.entity.position.y}, ${bot.entity.position.z}`);
        });
        bot.on("error", (err) => {
            console.error("An error occurred:", err);
        });
        // bot.on("chat", (username, message) => {
        //     // if (username === bot.username) return; // Ignore messages from the bot itself
        //     console.log(`Chat message from ${username}: ${message}`);
        //     console.log(`${username}: ${message}`);
        // });
        bot.on("message", (message) => {
            // console.log("Message received:", message.toAnsi());
            console.log(`${chalk.gray(`[${bot.username}]`)} ${chalk.blue("[CHAT]")} ${message.toAnsi()}`);
        });
        bot.on("end", (reason) => {
            console.log("Bot has disconnected from the server.", reason);
        });
        // make it so i can type stuff in terminal using readline and it used eval to execute stuff for debug
        const rl = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.on("line", (input: string) => {
            try {
                eval(input);
            } catch (error) {
                logger.error("Error executing command:", error);
            }
        });
        logger.info("Bot is ready. You can now type commands in the terminal.");
    }
}
