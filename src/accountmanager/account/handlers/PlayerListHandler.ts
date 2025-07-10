import { ServerClient } from "minecraft-protocol";
import Handler from "./Handler";
import { Bot } from "mineflayer";

type PlayerInfo = {
    uuid: string;
    player: {
        name: string;
        properties: { key: string; value: string; signature?: string }[];
    };
    chatSession?: {
        expireTime: bigint;
        keyBytes: Buffer;
        keySignature: Buffer;
    };
    gamemode?: number;
    listed?: boolean;
    latency?: number;
    displayName?: any; // Anything
};

export default class PlayerListHandler extends Handler {
    private header: object = {};
    private footer: object = {};

    private playerInfoList: PlayerInfo[] = [];

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;

        // Clear data
        this.header = { type: "string", value: "" };
        this.footer = { type: "string", value: "" };

        this.playerInfoList = [];

        bot._client.on("playerlist_header", (data) => {
            this.header = data.header;
            this.footer = data.footer;
        });

        // Track the player info
        bot._client.on("player_info", (data) => {
            // 1.19.3 Removes action and makes it a bitfield
            // 1.19.2:
            // action: varint =>
            //     - add_player
            //     - update_game_mode
            //     - update_latency
            //     - update_display_name
            //     - remove_player
            // 1.19.3:
            // action: ["bitflags", {
            //     "type": "u8",
            //     "flags": [
            //         "add_player",
            //         "initialize_chat",
            //         "update_game_mode",
            //         "update_listed",
            //         "update_latency",
            //         "update_display_name"
            //     ]
            // }]
            if (bot.registry.supportFeature("playerInfoActionIsBitfield")) { // 1.19.3+
                if (data.action.add_player) {
                    data.data.forEach((player: PlayerInfo) => {
                        // Create a new player info if it doesn't exist
                        if (!this.playerInfoList.some(p => p.uuid === player.uuid)) {
                            this.playerInfoList.push(player);
                        } else {
                            // Update existing player info
                            const existingPlayer = this.playerInfoList.find(p => p.uuid === player.uuid);
                            if (existingPlayer) {
                                const newPlayer = {
                                    ...existingPlayer,
                                    ...player,
                                }
                                this.playerInfoList = this.playerInfoList.map(p => p.uuid === player.uuid ? newPlayer : p);
                            }
                        }
                    });
                } else if (data.action.initialize_chat) {
                } else if (
                    data.action.update_game_mode ||
                    data.action.update_listed ||
                    data.action.update_latency ||
                    data.action.update_display_name
                ) {
                    data.data.forEach((player: PlayerInfo) => {
                        const existingPlayer = this.playerInfoList.find(p => p.uuid === player.uuid);
                        if (existingPlayer) {
                            if (data.action.update_game_mode) existingPlayer.gamemode = player.gamemode;
                            if (data.action.update_listed) existingPlayer.listed = player.listed;
                            if (data.action.update_latency) existingPlayer.latency = player.latency;
                            if (data.action.update_display_name) existingPlayer.displayName = player.displayName;
                        }
                    });
                }
            } // 1.20.6 is the only version supported
        });
        bot._client.on("player_remove", (data) => {
            // Remove players from the player info list
            data.players.forEach((uuid: string) => {
                this.playerInfoList = this.playerInfoList.filter(p => p.uuid !== uuid);
            });
        });
    }

    public sendPlayerListToClient(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        client.write("player_info", {
            action: {
                add_player: true,
                initialize_chat: true,
                update_game_mode: true,
                update_listed: true,
                update_latency: true,
                update_display_name: true,
            },
            data: this.playerInfoList,
        });

        client.write("playerlist_header", {
            header: this.header,
            footer: this.footer,
        });
    }
}
