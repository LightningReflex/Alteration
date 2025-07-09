import logger from "./utils/Logger";
import { Terminal } from "./utils/Terminal";
import BotAccountManager from "./accountmanager/BotAccountManager";
import { Server } from "./server/Server";

export class Main {
    public static botAccountManager: BotAccountManager = new BotAccountManager();

    public static async main(): Promise<void> {
        let email;
        if (process.env.ALTERATION_EMAIL) {
            email = process.env.ALTERATION_EMAIL;
            logger.info(`Using email from environment variable (ALTERATION_EMAIL): ${email}`);
        } else {
            do {
                email = await Terminal.input("What account would you like to log in with (email)?");
                if (!email) {
                    logger.warn("Email cannot be empty. Please try again.");
                }
            } while (!email);
        }
        Main.botAccountManager.addAccount(email, "minehut.com", 25565);

        Server.start();
    }
}
