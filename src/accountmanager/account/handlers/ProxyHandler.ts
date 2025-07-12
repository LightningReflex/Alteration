import { ServerClient } from "minecraft-protocol";
import Handler from "./Handler";
import { Bot } from "mineflayer";
import chalk from "chalk";
import { Main } from "../../../Main";
import { ServerClientWrapper } from "../../../server/ServerClientWrapper";
export default class ProxyHandler extends Handler {
    public exemptedPacketsC2S: string[] = [
        "keep_alive",
        "pong",
    ];
    public exemptedPacketsS2C: string[] = [
        "keep_alive",
        "ping"
    ];

    public originalWriteBeforeApply!: (name: string, params: any) => void;
    public originalWrite!: (name: string, params: any) => void;

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;
        // TODO: apply velocity on join
        // Stop mineflayer physics :<
        this.originalWriteBeforeApply = bot._client.write;
        this.originalWrite = (name: string, params: any) =>
        this.originalWriteBeforeApply.apply(this.botAccount.bot!._client, [name, params]);
        bot._client.write = (name: string, params: any) => {
            // Should cancel if any of the connected clients are proxying packets
            const shouldCancelMovementPackets = Main.server.connectedClients.some(scw => scw.shouldProxyPackets);
            if (
                shouldCancelMovementPackets &&
                [
                    "flying",
                    "entity_action",
                    "position",
                    "look",
                    "position_look",
                    "teleport_confirm", // Will be backed by the connected client
                ].includes(name)
            ) {
                console.log(`Received movment packet: ${name}`, params)
                return; // Stop physics packets
            }
            this.originalWrite(name, params);
        };

        bot._client.on("packet", (data, meta) => { // Server to Client
            if (this.exemptedPacketsS2C.includes(meta.name)) {
                return;
            }
            const ignoreLog = [
                "world_particles",
                "entity_look",
                "entity_velocity",
                "rel_entity_move",
                "entity_metadata",
                "map",
                "scoreboard_objective",
            ]
            if (!ignoreLog.includes(meta.name)) {
                // console.log(chalk.blue(`S2C <- ${meta.name}`), meta);
            }
            if (meta.name == "entity_metadata") {
                // console.log("Received ent metadata");
                if (data.metadata) {
                    // console.log("Metadata:", JSON.stringify(data.metadata, null, 2));
                    for (const metadata of data.metadata) {
                        if (metadata.type === "painting_variant") {
                            console.log("Painting variant:", data);
                        }
                    }
                }
            }
            if (meta.name === "disconnect") {
                console.log("Bot disconnected:", JSON.stringify(data, null, 2));
            }
            // this.botAccount.connectedClients.forEach(client => {
            //     client.write(meta.name, data);
            // });
            Main.server.connectedClients.forEach(scw => {
                if (scw.connectedToBotAccount === this.botAccount) {
                    scw.serverClient.write(meta.name, data);
                }
            });
        });
        bot._client.on("end", () => {
            // When the bot disconnects, end all client connections
            Main.server.connectedClients.forEach(scw => {
                if (scw.connectedToBotAccount === this.botAccount) {
                    scw.serverClient.end("Bot has disconnected.");
                }
            });
        });
    }

    public startProxyPackets(scw: ServerClientWrapper) {
        // const bot: Bot = this.botAccount.bot!;
        scw.shouldProxyPackets = true;
    }

    public exemptPacketC2S(packetName: string) {
        if (!this.exemptedPacketsC2S.includes(packetName)) {
            this.exemptedPacketsC2S.push(packetName);
        }
    }
    public exemptPacketS2C(packetName: string) {
        if (!this.exemptedPacketsS2C.includes(packetName)) {
            this.exemptedPacketsS2C.push(packetName);
        }
    }
}
