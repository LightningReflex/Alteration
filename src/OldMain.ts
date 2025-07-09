import mc from "minecraft-protocol";
import { PCChunk } from "prismarine-chunk";
import mineflayer from "mineflayer";
import logger from "./utils/Logger";
import { Terminal } from "./utils/Terminal";
import chalk from "chalk";
import allMcData from "minecraft-data";

export class Main {
    public static async main(): Promise<void> {
        logger.info("Starting the bot...");
        // const test = await Terminal.input("What account would you like to log in with (email)?")
        let email;
        do {
            email = await Terminal.input("What account would you like to log in with (email)?");
            if (!email) {
                logger.warn("Email cannot be empty. Please try again.");
            }
        } while (!email);
        logger.info(`Logging in with account: ${email}`);
        const server = mc.createServer({
            "online-mode": true,
            host: "0.0.0.0",
            port: 25565,
            version: "1.20.6"
        });
        const mcData = allMcData((server as any)["version"]);
        // console.log(`mcData:`, mcData);
        // server.on("login", (client) => {
        //     logger.info(`Client ${client.username} has logged in.`);
        //     client.on("end", () => {
        //         logger.info(`Client ${client.username} has disconnected.`);
        //     });
        //     client.on("error", (err) => {
        //         logger.error(`Error for client ${client.username}:`, err);
        //     });
        // });
        // server.on("login", (client) => {
        //     client.on()
        // });

        const bot = mineflayer.createBot({
            host: "minehut.com",
            username: email,
            // auth: "microsoft",
            onMsaCode: (code) => {
                logger.info("Please enter the following code in your browser to authenticate:");
                logger.info(code);
            },
            profilesFolder: "../profiles",
            version: "1.20.6",
        });
        server.on("playerJoin", function(client) {
            console.log(`Player ${client.username} has joined the server.`);
            const loginPacket = mcData.loginPacket;

            client.write("login", {
                ...loginPacket,
                enforceSecureChat: false,
                entityId: client.id,
                hashedSeed: [0, 0],
                maxPlayers: server.maxPlayers,
                viewDistance: 10,
                reducedDebugInfo: false,
                enableRespawnScreen: true,
                isDebug: false,
                isFlat: false
            });

            const botEnt = bot.entity;
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

            // Send chunks
            // (<PCChunk>bot.world.getColumns()[0].column).dump()
            // const column = bot.world.getColumns()[0].column;
            let columns = bot.world.getColumns();
            // sort from closest to farthest to botPos
            columns = columns.sort((a, b) => {
                const aPos = { x: a.chunkX * 16 + 8, z: a.chunkZ * 16 + 8 };
                const bPos = { x: b.chunkX * 16 + 8, z: b.chunkZ * 16 + 8 };
                const aDist = Math.sqrt(Math.pow(aPos.x - botPos.x, 2) + Math.pow(aPos.z - botPos.z, 2));
                const bDist = Math.sqrt(Math.pow(bPos.x - botPos.x, 2) + Math.pow(bPos.z - botPos.z, 2));
                return aDist - bDist;
            });
            for (const columnLoop of columns) {
                // const column = (<PCChunk>bot.world.getColumns()[0].column);
                const column = columnLoop.column as PCChunk;
                const light = column.dumpLight() as unknown as {
                    skyLight: Buffer,
                    blockLight: Buffer,
                    skyLightMask: number[],
                    blockLightMask: number[],
                    emptySkyLightMask: number[],
                    emptyBlockLightMask: number[]
                };
                client.write("map_chunk", {
                    x: columnLoop.chunkX,
                    z: columnLoop.chunkZ,
                    heightmaps: {
                        "type": "compound",
                        "value": {
                            "MOTION_BLOCKING": {
                            "type": "longArray",
                            "value": [[521111475,-638782342],[533710819,-235603332],[521103283,-639041921],[529508307,-370083716],[516908963,-100860802],[525313987,-504301445],[512747491,-235340675],[521111491,-504301957],[529516515,-235603331],[521111491,-638782338],[529508307,-370083716],[521103283,-101122946],[525313987,-504301444],[533678051,-235340675],[521111491,-504298879],[529516515,-369821059],[521111492,168097916],[529508307,-369821572],[521111474,-647431042],[525314003,-504301444],[516900259,-235340675],[525313987,-504301443],[378521571,-235603331],[521111507,-369821061],[529516499,-369821059],[529500115,-370363266],[529508307,-369821059],[521111474,-637993858],[529516515,-235340674],[520841187,-235340675],[533719011,-369821572],[529516515,-235340161],[525314003,-370083716],[529516516,33620096],[542099427,-370606466],[529541140,168098433],[3,-100860802]
                            ]
                            },
                            "WORLD_SURFACE": {
                            "type": "longArray",
                            "value": [[521111475,-638782342],[533710819,-235603332],[521103283,-639041921],[529508307,-370083716],[516908963,-100860802],[525313987,-504301445],[512747491,-235340675],[521111491,-504301957],[529516515,-235603331],[521111491,-638782338],[529508307,-370083716],[521103283,-101122946],[525313987,-504301444],[533678051,-235340675],[521111491,-504298879],[529516515,-369821059],[521111492,168097916],[529508307,-369821572],[521111474,-647431042],[525314003,-504301444],[525288867,-235340675],[525313987,-504301443],[378521571,-235603331],[521111507,-369821061],[529516499,-369821059],[529500115,-370363266],[529508307,-369821059],[521111474,-637993858],[529516515,-235340674],[520841187,-235340675],[533719011,-101385092],[529516515,-235340161],[525314003,-369559428],[529516516,33620096],[542099427,-370606466],[529541140,168099457],[3,-100860802]
                            ]
                            }
                        }
                    },
                    chunkData: column.dump(),
                    blockEntities: [],
                    skyLightMask: light.skyLightMask,
                    blockLightMask: light.blockLightMask,
                    emptySkyLightMask: light.emptySkyLightMask,
                    emptyBlockLightMask: light.emptyBlockLightMask,
                    skyLight: light.skyLight,
                    blockLight: light.blockLight,
                });
            }

            // Tell client done loading chunks
            // Load entities
            // "packet_spawn_entity": [
            //     "container",
            //     [
            //         {
            //         "name": "entityId",
            //         "type": "varint"
            //         },
            //         {
            //         "name": "objectUUID",
            //         "type": "UUID"
            //         },
            //         {
            //         "name": "type",
            //         "type": "varint"
            //         },
            //         {
            //         "name": "x",
            //         "type": "f64"
            //         },
            //         {
            //         "name": "y",
            //         "type": "f64"
            //         },
            //         {
            //         "name": "z",
            //         "type": "f64"
            //         },
            //         {
            //         "name": "pitch",
            //         "type": "i8"
            //         },
            //         {
            //         "name": "yaw",
            //         "type": "i8"
            //         },
            //         {
            //         "name": "headPitch",
            //         "type": "i8"
            //         },
            //         {
            //         "name": "objectData",
            //         "type": "varint"
            //         },
            //         {
            //         "name": "velocityX",
            //         "type": "i16"
            //         },
            //         {
            //         "name": "velocityY",
            //         "type": "i16"
            //         },
            //         {
            //         "name": "velocityZ",
            //         "type": "i16"
            //         }
            //     ]
            // ],
            for (const entity of Object.values(bot.entities)) {
                mcData.entitiesByName
                if (
                    entity.id !== undefined &&
                    entity.uuid !== undefined &&
                    entity.entityType !== undefined &&
                    entity.position && entity.position.x !== undefined && entity.position.y !== undefined && entity.position.z !== undefined
                ) {
                    console.log(`Spawning entity: ${entity.name}, ${entity.entityType}`);
                    if (entity.type === "player") {
                        const uuid = entity.uuid ?? Object.values(bot.players).find(p => p.username === entity.username)?.uuid
                        if (!uuid) continue

                        // If we're missing the UUID we need to temporarily add it to the tab list (it's probably an NPC)
                        const isTempPlayer = !Object.values(bot.players).some(p => p.uuid === uuid) && entity.uuid && entity.username
                        if (isTempPlayer) {
                            client.write("player_info", {
                                action: 17,
                                data: [{
                                    uuid: entity.uuid,
                                    player: {
                                        name: entity.username,
                                        properties: []
                                    }
                                }],
                                displayName: entity.displayName
                            })
                        }

                        client.write("named_entity_spawn", {
                            entityId: entity.id,
                            playerUUID: uuid,
                            ...entity.position,
                            yaw: Main.toAngle(entity.yaw),
                            pitch: Main.toAngle(entity.pitch)
                        })

                        if (isTempPlayer) {
                            client.write("player_remove", {
                                players: [entity.uuid]
                            })
                        }
                    } else {
                        console.log(`All arguments: ${entity.id}, ${entity.uuid}, ${entity.entityType}, ${entity.position.x}, ${entity.position.y}, ${entity.position.z}`);
                        client.write("spawn_entity", {
                            entityId: entity.id,
                            objectUUID: entity.uuid,
                            type: entity.entityType,
                            ...entity.position,
                            pitch: Main.toAngle(entity.pitch),
                            yaw: Main.toAngle(entity.yaw),
                            headPitch: Main.toAngle((entity as any).headPitch || 0),
                            // pitch: 0,
                            // yaw: 0,
                            // headPitch: 0,
                            objectData: (entity as any).objectData || 0,
                            velocityX: 0,
                            velocityY: 0,
                            velocityZ: 0
                        });
                    }
                }
            }
            // client.write("spawn_entity", {
            //     "entityId": 306389,
            //     "objectUUID": "c97b3813-37a1-47c6-b013-f90bb3e5e8f2",
            //     "type": 59,
            //     "x": -146,
            //     "y": 24.42605029008414,
            //     "z": 25,
            //     "pitch": -26,
            //     "yaw": -32,
            //     "headPitch": 0,
            //     "objectData": 0,
            //     "velocityX": 0,
            //     "velocityY": 0,
            //     "velocityZ": 0
            // });
        });
        bot.on("spawn", () => {
            console.log("Bot has spawned in the game.");
            bot.entity.position = bot.entity.position || { x: 0, y: 0, z: 0 };
            logger.info(`Bot position: ${bot.entity.position.x}, ${bot.entity.position.y}, ${bot.entity.position.z}`);
        });
        bot.on("error", (err) => {
            console.error("An error occurred:", err);
        });
        // bot.on("chat", (username, message) => {
        //     // if (username === bot.username) return; // Ignore messages from the bot itself
        //     console.log(`Chat message from ${username}: ${message}`);
        //     console.log(`${username}: ${message}`);
        // });
        bot._client.on("packet", (data, meta) => {
            // only registry_data is logged
            // if (meta.name === "registry_data") {
            //     console.log("Registry data received:", data.id);
            //     // logger.info("Registry data received:", data);
            //     // save to file named after "id"
            //     const id = data.id.replace("/", "");
            //     const fs = require("fs");
            //     const path = require("path");
            //     const filePath = path.join(__dirname, `registry_data_${id}.json`);
            //     fs.writeFile(filePath, JSON.stringify(data, null, 2), (err: NodeJS.ErrnoException | null) => {
            //         if (err) {
            //             logger.error("Error writing registry data to file:", err);
            //         }
            //         else {
            //             logger.info(`Registry data saved to ${filePath}`);
            //         }
            //     });
            // }
            // if map_chunk print hieghtmaps jsonified
            // if (meta.name === "map_chunk") {
            //     console.log("Map chunk received:", JSON.stringify(data.heightmaps, null, 2));
            //     // logger.info("Map chunk received:", data.heightmaps);
            // }
            // if (meta.name === "spawn_entity") {
            //     console.log("Spawn entity received:", JSON.stringify(data, null, 2));
            // }
            // Print packet name received
            // console.log(`Packet received: ${meta.name}`);
            // log to test.txt
            // const fs = require("fs");
            // const path = require("path");
            // const filePath = path.join(__dirname, "test.txt");
            // fs.appendFile(filePath, `Packet received: ${meta.name}\n`, (err: NodeJS.ErrnoException | null) => {});
        });
        bot.on("message", (message) => {
            // console.log("Message received:", message.toAnsi());
            console.log(`${chalk.gray(`[${bot.username}]`)} ${chalk.blue("[CHAT]")} ${message.toAnsi()}`);
        });
        bot.on("end", (reason) => {
            console.log("Bot has disconnected from the server.", reason);
        });
        // make it so i can type stuff in terminal using readline and it used eval to execute stuff for debug
        const rl = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.on("line", (input: string) => {
            try {
                eval(input);
            } catch (error) {
                logger.error("Error executing command:", error);
            }
        });
        logger.info("Bot is ready. You can now type commands in the terminal.");
    }

    static toAngle(f: number) {
        let b = Math.floor((f % 360) * 256 / 360)
        if (b < -128) b += 256
        else if (b > 127) b -= 256
        return b
    }
}
