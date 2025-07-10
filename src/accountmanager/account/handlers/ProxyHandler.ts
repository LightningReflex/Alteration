import { ServerClient } from "minecraft-protocol";
import Handler from "./Handler";
import { Bot } from "mineflayer";
export default class ProxyHandler extends Handler {
    protected onInit(): void {
        // const bot: Bot = this.botAccount.bot!;
        // bot.on("message", (message) => {
        //     this.botAccount.log(LogType.CHAT, message.toAnsi());
        // });
    }

    public startProxyPackets(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        // setTimeout(() => {
            // start passing through packets back and forth
            bot._client.on("packet", (data, meta) => {
                if (meta.name === "keep_alive") {
                    // Ignore keep alive packets
                    return;
                }
                // Forward other packets to the client
                client.write(meta.name, data);
            });
            bot._client.on("end", () => {
                // When the bot disconnects, end the client connection
                client.end("Bot has disconnected.");
            });
            client.on("packet", (data, meta) => {
                if (meta.name === "keep_alive") {
                    // Ignore keep alive packets
                    return;
                }
                // Forward other packets to the bot
                bot?._client.write(meta.name, data);
            });
            // client.on("end", () => {
            //     // When the client disconnects, end the bot connection
            //     if (bot) {
            //         bot._client.end("Client has disconnected.");
            //     }
            // });
        // }, 70000);
    }
}
