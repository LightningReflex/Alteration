import { ServerClient } from "minecraft-protocol";
import Handler from "./Handler";
import { Bot } from "mineflayer";
export default class ProxyHandler extends Handler {
    private exemptPacketsC2S: string[] = [
        "keep_alive",
    ];
    private exemptPacketsS2C: string[] = [
        "keep_alive",
    ];

    protected onInit(): void {}

    public startProxyPackets(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        bot._client.on("packet", (data, meta) => {
            if (this.exemptPacketsS2C.includes(meta.name)) {
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
            if (this.exemptPacketsC2S.includes(meta.name)) {
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
    }

    public exemptPacketC2S(packetName: string) {
        if (!this.exemptPacketsC2S.includes(packetName)) {
            this.exemptPacketsC2S.push(packetName);
        }
    }
    public exemptPacketS2C(packetName: string) {
        if (!this.exemptPacketsS2C.includes(packetName)) {
            this.exemptPacketsS2C.push(packetName);
        }
    }
}
