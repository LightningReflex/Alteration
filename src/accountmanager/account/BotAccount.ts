import mineflayer, { Bot } from "mineflayer";
import logger from "../../utils/Logger";
import ChatHandler from "./handlers/ChatHandler";
import chalk from "chalk";
import { ServerClient } from "minecraft-protocol";
import { Server } from "../../server/Server";
import WorldHandler from "./handlers/WorldHandler";
import EntityHandler from "./handlers/EntityHandler";
import PlayerListHandler from "./handlers/PlayerListHandler";
import ProxyHandler from "./handlers/ProxyHandler";
import InventoryHandler from "./handlers/InventoryHandler";


export default class BotAccount {
    public bot: Bot | null = null;
    private connectionEnded: boolean = false;
    public ip: string = "localhost";
    public port: number = 25565;

    // Handlers
    private chatHandler: ChatHandler = new ChatHandler(this);
    private worldHandler: WorldHandler = new WorldHandler(this);
    private playerListHandler: PlayerListHandler = new PlayerListHandler(this);
    private entityHandler: EntityHandler = new EntityHandler(this);
    private inventoryHandler: InventoryHandler = new InventoryHandler(this);
    private proxyHandler: ProxyHandler = new ProxyHandler(this);

    constructor(
        public readonly username: string,
    ) {}

    public async connect(ip: string = this.ip, port: number = this.port): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.bot && this.isConnected()) {
                throw new Error("Already connected");
            }
            this.connectionEnded = false;

            this.ip = ip;
            this.port = port;

            this.bot = mineflayer.createBot({
                host: this.ip,
                port: this.port,
                username: this.username,
                version: "1.20.6",
                auth: "microsoft",
                profilesFolder: "../profiles",
                onMsaCode: (code) => {
                    logger.info("Please go to the following url in your browser to authenticate:");
                    logger.info(`${code.verification_uri}?otc=${code.user_code}`);
                },
            });

            this.bot.on("login", () => {
                logger.info(`Bot ${this.username} has logged in successfully.`);
                resolve();
            });

            this.bot.on("end", () => {
                logger.warn(`Bot ${this.username} has disconnected. Attempting to reconnect...`);
                this.connectionEnded = true
                setTimeout(this.connect.bind(this), 5000); // Reconnect after 5 seconds
            });

            this.chatHandler.init();
            this.worldHandler.init();
            this.playerListHandler.init();
            this.inventoryHandler.init();
            this.proxyHandler.init();
        });
    }

    public isConnected(): this is { bot: Bot } {
        return this.bot !== null && !this.connectionEnded;
    }

    public connectClient(client: ServerClient): void {
        if (!this.isConnected()) {
            throw new Error("Bot account is not connected.");
        }
        const loginPacket = Server.mcData.loginPacket;
        client.write("login", {
            ...loginPacket,
            entityId: client.id,
            isHardcore: this.bot.game.hardcore,
            worldNames: ["minecraft:" + this.bot.game.dimension],
            maxPlayers: this.bot.game.maxPlayers,
            viewDistance: 10, // TODO: track this and passthrough correctly
            simulationDistance: 10,
            reducedDebugInfo: false,
            enableRespawnScreen: true,
            doLimitedCrafting: false,
            // worldState:
            enforceSecureChat: false,
        });

        const botEnt = this.bot.entity;
        const botPos = botEnt.position || { x: 0, y: 0, z: 0 };
        client.write("position", {
            x: botPos.x || 0,
            y: botPos.y || 0,
            z: botPos.z || 0,
            yaw: botEnt.pitch || 0,
            pitch: botEnt.yaw || 0,
            flags: 0x00,
            teleportId: 0,
        });

        this.worldHandler.sendChunksToClient(client);

        client.write("position", {
            x: this.bot.entity.position.x,
            y: this.bot.entity.position.y,
            z: this.bot.entity.position.z,
            yaw: this.bot.entity.yaw,
            pitch: this.bot.entity.pitch,
            flags: 0,
            teleportId: 0,
        });

        this.playerListHandler.sendPlayerListToClient(client);
        this.inventoryHandler.sendInventoryToClient(client);

        client.write("spawn_position", {
            location: this.bot.entity.position,
            angle: 0,
        });
        client.write("update_time", {
            age: this.bot.time.age,
            time: this.bot.time.time,
        });

        // // wait 30 seconds
        // setTimeout(() => {
        this.proxyHandler.startProxyPackets(client);
        // }, 70000);
    }

    public log(type: LogType, message: string): void {
        const username = this.bot ? this.bot.username : this.username;
        let prefix;
        switch (type) {
            case LogType.CHAT:
                prefix = chalk.yellow("[CHAT]");
                break;
            default:
                prefix = chalk.blue("[INFO]");
                break;
        }
        console.log(`${chalk.gray(`[${username}]`)} ${prefix} ${message}`);
    }
}

export enum LogType {
    CHAT = "CHAT",
}
