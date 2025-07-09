import { Main } from "../Main";
import mc from "minecraft-protocol";
import allMcData, { IndexedData } from "minecraft-data";
import logger from "../utils/Logger";

export class Server {
    public static mcData: IndexedData;

    public static async start(): Promise<void> {
        const server = mc.createServer({
            "online-mode": true,
            host: "0.0.0.0",
            port: 25565,
            version: "1.20.6"
        });
        // TODO: Maybe add proper typings for the stuff node-minecraft-protocol and mineflayer just doesn't provide but has for some reason
        Server.mcData = allMcData((server as any as { version: string }).version);
        server.on("playerJoin", function(client) {
            const allAccounts = Main.botAccountManager.getAllAccounts();
            const botAccount = allAccounts[0];
            const bot = botAccount?.bot;
            if (!botAccount || !bot || !botAccount.isConnected()) {
                client.end("Bot is not connected yet.");
                return;
            }

            logger.info(`Player ${client.username} has joined the server.`);
            botAccount.connectClient(client);
        });
    }
}