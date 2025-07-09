import { ServerClient } from "minecraft-protocol";
import { LogType } from "../BotAccount";
import Handler from "./Handler";
import { Bot } from "mineflayer";
import { Item } from "prismarine-item";

type ItemAccessor = Item & { // Mineflayer typings are horribly uncomplete
    components: {
        type: string; // custom_name
        data: any; // can be anything
    }[];
    removedComponents: {
        type: string; // custom_name
        data: any; // can be anything
    }[];
}

export default class InventoryHandler extends Handler {
    protected onInit(): void {}

    public sendInventoryToClient(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        const inventorySlots = bot.inventory.slots as (ItemAccessor | null)[];
        client.write('window_items', {
            windowId: 0,
            stateId: 0,
            items: inventorySlots.map(slot => slot && slot.count > 0 ? {
                itemCount: slot.count,
                itemId: slot.type,
                addedComponentCount: slot.components ? slot.components.length : 0,
                removedComponentCount: slot.removedComponents ? slot.removedComponents.length : 0,
                components: slot.components ? slot.components.map(component => ({
                    type: component.type,
                    data: component.data,
                })) : [],
                removeComponents: slot.removedComponents ? slot.removedComponents.map(component => ({
                    type: component.type,
                    data: component.data,
                })) : [],
                type: slot.type
            } : { itemCount: 0 }),
            carriedItem: { itemCount: 0 },
        });
    }
}
