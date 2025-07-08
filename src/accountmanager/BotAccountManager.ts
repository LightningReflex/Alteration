import BotAccount from "./account/BotAccount";

export default class BotAccountManager {
    private accounts: Map<string, BotAccount> = new Map();

    public async addAccount(username: string, ip: string = "localhost", port: number = 25565): Promise<BotAccount> {
        if (this.accounts.has(username)) {
            throw new Error(`Account with username ${username} already exists.`);
        }
        const account = new BotAccount(username);
        await account.connect(ip, port);
        this.accounts.set(username, account);
        return account;
    }

    public getAccount(username: string): BotAccount | undefined {
        return this.accounts.get(username);
    }

    public removeAccount(username: string): void {
        this.accounts.delete(username);
    }
}
