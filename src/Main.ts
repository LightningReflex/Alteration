import logger from "./utils/Logger";
import { Terminal } from "./utils/Terminal";
import BotAccountManager from "./accountmanager/BotAccountManager";
import { Server } from "./server/Server";

export class Main {
    public static botAccountManager: BotAccountManager = new BotAccountManager();

    public static async main(): Promise<void> {
        let email;
        do {
            email = await Terminal.input("What account would you like to log in with (email)?", "kyan.wahr@gmail.com");
            if (!email) {
                logger.warn("Email cannot be empty. Please try again.");
            }
        } while (!email);
        Main.botAccountManager.addAccount(email, "minehut.com", 25565);

        Server.start();
    }
}
