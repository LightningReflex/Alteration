import { ServerClient } from "minecraft-protocol";
import { LogType } from "../BotAccount";
import Handler from "./Handler";
import { Bot } from "mineflayer";

type ChatPacket = {
    name: string;
    data: object;
};

export default class ChatHandler extends Handler {
    private lastChatPackets: ChatPacket[] = []; // Last 300 messages

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;
        bot.on("message", (message) => {
            this.botAccount.log(LogType.CHAT, message.toAnsi());
        });
        bot._client.on("player_chat", (data) => {
            this.addToChatHistory("player_chat", data);
        });
        bot._client.on("system_chat", (data) => {
            this.addToChatHistory("system_chat", data);
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

    public sendChatHistory(client: ServerClient) {
        this.lastChatPackets.forEach(packet => {
            client.write(packet.name, packet.data);
        });
    }

    public addToChatHistory(name: string, data: object) {
        const packet: ChatPacket = { name, data };
        this.lastChatPackets.push(packet);
        if (this.lastChatPackets.length > 300) {
            this.lastChatPackets.shift(); // Remove the oldest packet if we exceed 300
        }
    }
}
