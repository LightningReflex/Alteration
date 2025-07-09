import { LogType } from "../BotAccount";
import Handler from "./Handler";
import { Bot } from "mineflayer";

export default class ChatHandler extends Handler {
    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;
        bot.on("message", (message) => {
            this.botAccount.log(LogType.CHAT, message.toAnsi());
        });
    }
}
