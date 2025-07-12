import { ServerClient } from "minecraft-protocol";
import BotAccount from "../accountmanager/account/BotAccount";
import chalk from "chalk";

export class ServerClientWrapper {
    public connectedToBotAccount: BotAccount | null = null;
    public shouldProxyPackets: boolean = false;

    constructor(
        public readonly serverClient: ServerClient,
    ) {
        this.serverClient.on("packet", (data, meta) => {
            const currentBotAcc = this.connectedToBotAccount;
            if (!currentBotAcc) return; // No bot account connected
            if (!this.shouldProxyPackets) return; // Not set to proxy packets
            if (currentBotAcc.proxyHandler.exemptedPacketsC2S.includes(meta.name)) {
                return;
            }
            console.log(chalk.red(`C2S -> ${meta.name}`), meta);
            // Update bot position and looks if updated:
            if (meta.name === "position" || meta.name === "position_look" || meta.name === "look") {
                const bot = currentBotAcc.bot;
                console.log("POSITION APCKETT!!!")
                if (!bot) return;
                console.log("Setting bot position to", data);
                bot.entity.position.set(data.x, data.y, data.z);
                // bot.entity.yaw = ServerClientWrapper.fromNotchianYaw(data.yaw ?? bot.entity.yaw);
                // bot.entity.pitch = ServerClientWrapper.fromNotchianPitch(data.pitch ?? bot.entity.pitch);
                // no conversion
                bot.entity.yaw = data.yaw ?? bot.entity.yaw;
                bot.entity.pitch = data.pitch ?? bot.entity.pitch;
                bot.entity.onGround = data.onGround;
            }
            // Forward other packets to the bot
            // currentBotAcc.bot?._client.write(meta.name, data);
            currentBotAcc.proxyHandler.originalWrite(meta.name, data); // To cancel packets sent by mineflayer physics
        });
    }

    private static PI: number = Math.PI
    private static PI_2: number = Math.PI * 2
    private static TO_RAD: number = ServerClientWrapper.PI / 180
    private static TO_DEG: number = 1 / ServerClientWrapper.TO_RAD

    private static euclideanMod(numerator: number, denominator: number) {
        const result = numerator % denominator
        return result < 0 ? result + denominator : result
    }

    private static toRadians(degrees: number) {
        return ServerClientWrapper.TO_RAD * degrees
    }

    private static toDegrees(radians: number) {
        return ServerClientWrapper.TO_DEG * radians
    }

    private static fromNotchianYaw(yaw: number) {
        return ServerClientWrapper.euclideanMod(ServerClientWrapper.PI - ServerClientWrapper.toRadians(yaw), ServerClientWrapper.PI_2)
    }

    private static fromNotchianPitch(pitch: number) {
        return ServerClientWrapper.euclideanMod(ServerClientWrapper.toRadians(-pitch) + ServerClientWrapper.PI, ServerClientWrapper.PI_2) - ServerClientWrapper.PI
    }
}
