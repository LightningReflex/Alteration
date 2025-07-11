import { ServerClient } from "minecraft-protocol";
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

    public fixChatSigning(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        this.botAccount.proxyHandler.exemptPacketC2S("chat_message");
        client.on("chat_message", (data) => {
            if (data.signature) {
                bot._client.chat(data.message);
            }
        });
    }
}
