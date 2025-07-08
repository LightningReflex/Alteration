import mineflayer, { Bot } from "mineflayer";
import logger from "../../utils/Logger";
import ChatHandler from "./handlers/ChatHandler";
import chalk from "chalk";


export default class BotAccount {
    public bot: Bot | null = null;
    private connectionEnded: boolean = false;
    public ip: string = "localhost";
    public port: number = 25565;

    // Handlers
    private chatHandler: ChatHandler = new ChatHandler(this);

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
                console.log(`Bot ${this.username} has disconnected.`);
                this.connectionEnded = true
                setTimeout(this.connect.bind(this), 5000); // Reconnect after 5 seconds
            });

            this.chatHandler.init();
        });
    }

    public isConnected(): boolean {
        return this.bot !== null && !this.connectionEnded;
    }

    public log(type: LogType, message: string): void {
        const username = this.bot ? this.bot.username : this.username;
        // console.log(`${chalk.gray(`[${username}]`)} ${chalk.blue("[CHAT]")} ${message}`);
        // CHAT will be blue other is red
        let prefix = "";
        switch (type) {
            case LogType.CHAT:
                prefix += chalk.yellow("[CHAT]");
                break;
            default:
                prefix += chalk.blue("[INFO]");
                break;
        }
        console.log(`${chalk.gray(`[${username}]`)} ${prefix} ${message}`);
    }
}

export enum LogType {
    CHAT = "CHAT",
}
