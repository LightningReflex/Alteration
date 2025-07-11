import { ServerClient } from "minecraft-protocol";
import Handler from "./Handler";
import { Bot } from "mineflayer";
import logger from "../../../utils/Logger";

// packet_boss_bar:
//     entityUUID: UUID
//     action: varint
//     title: action ?
//         if 0: anonymousNbt
//         if 3: anonymousNbt
//         default: void
//     health: action ?
//         if 0: f32
//         if 2: f32
//         default: void
//     color: action ?
//         if 0: varint
//         if 4: varint
//         default: void
//     dividers: action ?
//         if 0: varint
//         if 4: varint
//         default: void
//     flags: action ?
//         if 0: u8
//         if 5: u8
//         default: void
type BossBar = {
    entityUUID: string;
    title: object; // anonymousNbt
    health: number;
    color: number;
    dividers: number;
    flags: number;
};

type BossBarPacket = { action: number } & BossBar;

export default class BossBarsHandler extends Handler {
    private bossBars: BossBar[] = [];

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;

        // Clear data
        this.bossBars = [];

        bot._client.on("boss_bar", (data: BossBarPacket) => {
            const action = data.action;
            // 0: add; 1: remove; 2: update health; 3: update title; 4: update style; 5: update flags
            const existingBar = this.bossBars.find(bar => bar.entityUUID === data.entityUUID);
            if (action === 0) { // Add boss bar
                this.bossBars.push({
                    entityUUID: data.entityUUID,
                    title: data.title,
                    health: data.health,
                    color: data.color,
                    dividers: data.dividers,
                    flags: data.flags,
                });
            } else if (action === 1) { // Remove boss bar
                this.bossBars = this.bossBars.filter(bar => bar.entityUUID !== data.entityUUID);
            } else if (action === 2) { // Update health
                if (existingBar) existingBar.health = data.health;
            } else if (action === 3) { // Update title
                if (existingBar) existingBar.title = data.title;
            } else if (action === 4) { // Update style
                if (existingBar) {
                    existingBar.color = data.color;
                    existingBar.dividers = data.dividers;
                }
            } else if (action === 5) { // Update flags
                if (existingBar) existingBar.flags = data.flags;
            } else {
                logger.warn(`Unknown boss bar action: ${action}`, data);
            }
        });
    }

    public sendBossBarsToClient(client: ServerClient) {
        this.bossBars.forEach(bar => {
            client.write("boss_bar", {
                action: 0, // Add boss bar
                entityUUID: bar.entityUUID,
                title: bar.title,
                health: bar.health,
                color: bar.color,
                dividers: bar.dividers,
                flags: bar.flags,
            });
        });
    }
}
