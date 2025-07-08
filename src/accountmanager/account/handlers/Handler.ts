import BotAccount from "../BotAccount";

export default abstract class Handler {
    protected botAccount: BotAccount;

    constructor(botAccount: BotAccount) {
        this.botAccount = botAccount;
    }

    /**
     * Start handling stuff with the bot account.
     */
    public init(): void {
        if (!this.botAccount.isConnected()) {
            throw new Error("Bot account is not connected.");
        }
        this.onInit();
    }

    /**
     * Override this method to implement the specific handling logic.
     */
    protected abstract onInit(): void;
}
