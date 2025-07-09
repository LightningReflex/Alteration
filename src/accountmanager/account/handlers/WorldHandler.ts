import Handler from "./Handler";
import { Bot } from "mineflayer";
import { ServerClient } from "minecraft-protocol";
import { PCChunk } from "prismarine-chunk";
import type { Vec3 } from "vec3";
import { fixNbt } from "../../../utils/Utils";
import logger from "../../../utils/Logger";

// Special thanks to https://github.com/PondWader/Mineflayer-Spectator

type BlockEntity = {
    x: number;
    y: number;
    z: number;
    type: number; // Block entity type
    nbtData: any;
}

type Chunk = PCChunk & {
    _spectatorData: {
        blockEntityTypes: { [key: string]: number }; // Maps "x,y,z" to block entity type
    }
    blockEntities: BlockEntity[];
};

type MapChunkPacket = {
    x: number;
    z: number;
    heightmaps: any; // TODO: Define this type properly
    // chunkData: [
    //     "buffer",
    //     {
    //     "countType": "varint"
    //     }
    // ]
    chunkData: Buffer;
    blockEntities: BlockEntity[];
    skyLightMask: number[]; // Array of 64-bit integers (i64)
    blockLightMask: number[]; // Array of 64-bit integers (i64)
    emptySkyLightMask: number[]; // Array of 64-bit integers (i64
    emptyBlockLightMask: number[]; // Array of 64-bit integers (i64)
    skyLight: number[]; // Array of 8-bit integers (u8)
    blockLight: number[]; // Array of 8-bit integers (u8)
};

type TileEntityDataPacket = {
    location: Vec3;
    action: number;
    nbtData: any;
};

export default class WorldHandler extends Handler {
    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;
        bot._client.on("map_chunk", (data: MapChunkPacket) => {
            if (data.blockEntities.length > 0) setImmediate(() => {
                for (const blockEntity of data.blockEntities) {
                    const column = bot.world.getColumn(data.x, data.z) as Chunk;
                    if (!column) {
                        logger.warn(`Something weird happened, could not find column in Mineflayer's world state at ${data.x}, ${data.z}`);
                        return;
                    }
                    if (!column._spectatorData) column._spectatorData = { blockEntityTypes: {} };
                    column._spectatorData.blockEntityTypes[`${blockEntity.x},${blockEntity.y},${blockEntity.z}`] = blockEntity.type;
                }
            });
        });

        bot._client.on("tile_entity_data", (data: TileEntityDataPacket) => {
            const column = bot.world.getColumnAt(data.location) as Chunk;
            if (!column._spectatorData) column._spectatorData = { blockEntityTypes: {} };
            column._spectatorData.blockEntityTypes[`${data.location.x % 16},${data.location.y},${data.location.z % 16}`] = data.action;
        });
    }

    public sendChunksToClient(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        const botEnt = bot.entity;
        const botPos = botEnt.position || { x: 0, y: 0, z: 0 };
        let columns = bot.world.getColumns();
        // Sort them so the first column is the one the bot is in
        columns = columns.sort((a, b) => {
            const aXChunk = a.chunkX;
            const aZChunk = a.chunkZ;
            const bXChunk = b.chunkX;
            const bZChunk = b.chunkZ;
            const botXChunk = Math.floor(botPos.x / 16);
            const botZChunk = Math.floor(botPos.z / 16);
            const aDistance = Math.sqrt(Math.pow(aXChunk - botXChunk, 2) + Math.pow(aZChunk - botZChunk, 2));
            const bDistance = Math.sqrt(Math.pow(bXChunk - botXChunk, 2) + Math.pow(bZChunk - botZChunk, 2));
            return aDistance - bDistance;
        });
        for (const columnLoop of columns) {
            const column = columnLoop.column as Chunk;
            const chunkX = columnLoop.chunkX;
            const chunkZ = columnLoop.chunkZ;
            const light = column.dumpLight() as unknown as {
                skyLight: Buffer,
                blockLight: Buffer,
                skyLightMask: number[],
                blockLightMask: number[],
                emptySkyLightMask: number[],
                emptyBlockLightMask: number[],
            };
            // console.log(`Sending chunk at ${columnLoop.chunkX}, ${columnLoop.chunkZ} to client.`);
            client.write("map_chunk", {
                x: chunkX,
                z: chunkZ,
                heightmaps: {
                    type: "compound",
                    value: {
                        MOTION_BLOCKING: {
                            type: "longArray",
                            value: [[521111475,-638782342],[533710819,-235603332],[521103283,-639041921],[529508307,-370083716],[516908963,-100860802],[525313987,-504301445],[512747491,-235340675],[521111491,-504301957],[529516515,-235603331],[521111491,-638782338],[529508307,-370083716],[521103283,-101122946],[525313987,-504301444],[533678051,-235340675],[521111491,-504298879],[529516515,-369821059],[521111492,168097916],[529508307,-369821572],[521111474,-647431042],[525314003,-504301444],[516900259,-235340675],[525313987,-504301443],[378521571,-235603331],[521111507,-369821061],[529516499,-369821059],[529500115,-370363266],[529508307,-369821059],[521111474,-637993858],[529516515,-235340674],[520841187,-235340675],[533719011,-369821572],[529516515,-235340161],[525314003,-370083716],[529516516,33620096],[542099427,-370606466],[529541140,168098433],[3,-100860802]],
                        },
                        WORLD_SURFACE: {
                            type: "longArray",
                            value: [[521111475,-638782342],[533710819,-235603332],[521103283,-639041921],[529508307,-370083716],[516908963,-100860802],[525313987,-504301445],[512747491,-235340675],[521111491,-504301957],[529516515,-235603331],[521111491,-638782338],[529508307,-370083716],[521103283,-101122946],[525313987,-504301444],[533678051,-235340675],[521111491,-504298879],[529516515,-369821059],[521111492,168097916],[529508307,-369821572],[521111474,-647431042],[525314003,-504301444],[525288867,-235340675],[525313987,-504301443],[378521571,-235603331],[521111507,-369821061],[529516499,-369821059],[529500115,-370363266],[529508307,-369821059],[521111474,-637993858],[529516515,-235340674],[520841187,-235340675],[533719011,-101385092],[529516515,-235340161],[525314003,-369559428],[529516516,33620096],[542099427,-370606466],[529541140,168099457],[3,-100860802]],
                        },
                    },
                },
                chunkData: column.dump(),
                blockEntities: Object.entries(column.blockEntities).map(([key, nbtData]) => {
                    if (!column._spectatorData) {
                        console.log(`Mineflayer-Spectator: Missing _spectatorData for chunk at ${chunkX}, ${chunkZ}`);
                        return;
                    }
                    if (!column._spectatorData.blockEntityTypes[key]) {
                        console.log(`Mineflayer-Spectator: Missing blockEntity type for block entity at ${key} in chunk at ${chunkX}, ${chunkZ}`);
                        return;
                    }
                    const [x, y, z] = key.split(",").map(Number);
                    return {
                        x,
                        y,
                        z,
                        type: column._spectatorData.blockEntityTypes[key],
                        nbtData: nbtData ? fixNbt(nbtData) : undefined,
                    };
                }).filter(e => e !== undefined),
                ...light,
            });
        }
    }
}
