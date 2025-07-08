import chalk from "chalk";
import BotAccount, { LogType } from "../BotAccount";
import Handler from "./Handler";
import { Bot } from "mineflayer";

export default class ChatHandler extends Handler {
    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;
        bot.on("message", (message) => {
            // console.log("Message received:", message.toAnsi());
            // console.log(`${chalk.gray(`[${bot.username}]`)} ${chalk.blue("[CHAT]")} ${message.toAnsi()}`);
            this.botAccount.log(LogType.CHAT, message.toAnsi());
        });
    }
}
