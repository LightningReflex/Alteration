const mc = require('minecraft-protocol')
const nbt = require('prismarine-nbt')
const server = mc.createServer({
  'online-mode': true,   // optional
  encryption: true,      // optional
  host: '0.0.0.0',       // optional
  port: 25566,           // optional
  version: '1.21.4'
})
console.log("server.version", server.version)
const mcData = require('minecraft-data')(server.version)
const registryData = require('prismarine-registry')(server.version)
// console.log("registryData", registryData)

function chatText (text) {
  return mcData.supportFeature('chatPacketsUseNbtComponents')
    ? nbt.comp({ text: nbt.string(text) })
    : JSON.stringify({ text })
}

server.on("connection", function(client) {
    client.on('packet', function(packet, meta) {
        console.log("!!! Packet sent to server:" + meta.name + ":", meta)
    });
    console.log("Client connected:", client.username)
    client.on('state', (now) => {
        console.log("Client state changed:", now)
        if (now === 'configuration') {
            console.log("Client is in configuration state: " + client.supportFeature('segmentedRegistryCodecData'))
            mcData.loginPacket.dimensionCodec = {};
            // console.log("mcData.registryCodec", mcData.loginPacket?.dimensionCodec)
            // client.write = 
            const oldWrite = client.write.bind(client)
            let allowfinish = false;
            let firstFinishConfig = true;
            function finishConfig() {
                // // Read from regs/registry_data_anything.json where "anything" can be anything and contains the data for the packet registry_data
                // // so read dir first
                const fs = require('fs')
                const path = require('path')
                const registryDataDir = path.join(__dirname, 'regs')
                // add to a list of files first
                const registryFiles = fs.readdirSync(registryDataDir).filter(file => file.endsWith('.json'))
                // console.log("registryFiles", registryFiles)
                // Now read each file and write the data to the client
                let count = 0;
                for (const file of registryFiles) {
                    count++;
                    const filePath = path.join(registryDataDir, file)
                    // Read the file and parse the JSON
                    const data = fs.readFileSync(filePath, 'utf8')
                    try {
                        const jsonData = JSON.parse(data)
                        // Write the data to the client
                        // console.log("Writing registry_data packet for file:", file, "with data:", jsonData)
                        // if second to last set finish_configuration to true
                        if (count === registryFiles.length) {
                            allowfinish = true;
                        }
                        client.write('registry_data', {
                            id: jsonData.id + 'fixpls', // Add 'fixpls' to the id
                            entries: jsonData.entries,
                        });
                    } catch (parseError) {
                        console.error("Error parsing JSON from file:", file, parseError)
                    }
                }
                // client.write('registry_data', { codec: server.registryCodec || {} })
                allowfinish = true; // Set allowfinish to true after sending the registry_data packet
                client.write('finish_configuration', {})
                console.log("  - Client is in configuration state, writing registry_data packets")
                // Should this be put into loginPacket.json.. or figure out how to generate it inside flying-squid/what parts we really need
                // to send.
                // client.write('tags', require('./loginTags.json'))
                const loginTags = require('./loginTags.json')
                // console.log("loginTags", loginTags)
                client.write('tags', loginTags)
                console.log("  - Sent finish_configuration packet")
                console.log("  - CURRENT STATE: " + client.state)
                client.state = 'play' // Change the state to play
                server.emit('playerJoin', client) // Emit playerJoin event
                console.log("  - Player joined the server")
            }
            client.write = function(packetName, data) {
                console.log("Client write packet:", packetName)
                // if (packetName !== 'registry_data') {
                //     oldWrite(packetName, data);
                //     return;
                // }
                // // console.log("client.write", packetName, JSON.stringify(data, null, 2))
                // console.log("client.write", data.id)
                // // if packetName is "registry_data", cancel it, otherwise call the original write function
                // if (
                //     packetName === 'registry_data' &&
                //     (
                //         data.id === 'minecraft:worldgen/biome'
                //     )
                // ) {
                //     // console.log("Cancelling registry_data packet")
                //     return;
                // }
                // oldWrite(packetName, data)
                // if (data.id
                // if packetName is registry_data and id ends with "fixpls", remove from id and send, otherwise cancel
                if (packetName === 'registry_data' && data.id && data.id.endsWith('fixpls')) {
                    console.log("  - Writing registry_data packet with id:", data.id)
                    // remove 'fixpls' from the id
                    data.id = data.id.slice(0, -6)
                    console.log("  - Sending registry_data packet with id:", data.id)
                    // console.log("Sending registry_data packet with id:", data.id)
                    oldWrite(packetName, data)
                    if (allowfinish) {
                        client.write('finish_configuration', {})
                        console.log("  - CURRENT STATE: " + client.state)
                        client.state = 'play'
                        server.emit('playerJoin', client)
                        allowfinish = false; // Reset allowfinish after sending
                    }
                } else if (packetName === 'registry_data' && data.id) {
                    console.log("  - CANCELLED")
                    return // Cancel the registry_data packet
                }
                if (packetName === 'finish_configuration' && !allowfinish) {
                    console.log("  - Cancelling finish_configuration packet")
                    if (firstFinishConfig) {
                        console.log("  - first cancel")
                        firstFinishConfig = false; // Only cancel the first registry_data packet
                        finishConfig(); // Call finishConfig to send the registry_data packets
                    }
                    return; // Cancel the finish_configuration packet
                }
            }
            client.write('feature_flags', { features: ['minecraft:vanilla'] })
        }
    })
})

server.on("login", function(client) {
    console.log("Client logged in:", client.username)
//   const loginPacket = mcData.loginPacket
//     client.write('login', {
//       ...loginPacket,
//         enforcesSecureChat: false,
//         entityId: client.id,
//         levelType: 'default',
//         gameMode: 0,
//         previousGameMode: 0,
//         worldNames: ["world"],
//     //   dimensionCodec: ,
//         worldName: "world",
//     //   dimension: (serv.supportFeature('dimensionIsAString') || serv.supportFeature('dimensionIsAWorld')) ? serv.registry.loginPacket.dimension : 0,
//     //   dimension: 0,
//         hashedSeed: [0, 0],
//     //   difficulty: serv.difficulty,
//         difficulty: 2, // 0: peaceful, 1: easy, 2
//         // viewDistance: settings['view-distance'],
//         viewDistance: 10,
//         reducedDebugInfo: false,
//         // maxPlayers: Math.min(255, serv._server.maxPlayers),
//         maxPlayers: 20,
//         enableRespawnScreen: true,
//         isDebug: false,
//         // isFlat: settings.generation?.name === 'superflat'
//         isFlat: false
//     });
    // console.log when the server sends a packet to the client
});

server.on('playerJoin', function(client) {
  const loginPacket = mcData.loginPacket
  console.log("AaAAAA")
//   console.log("loginPacket", loginPacket)

//   client.write('login', {
//     ...loginPacket,
//     enforceSecureChat: false,
//     entityId: client.id,
//     hashedSeed: [0, 0],
//     maxPlayers: server.maxPlayers,
//     viewDistance: 10,
//     reducedDebugInfo: false,
//     enableRespawnScreen: true,
//     isDebug: false,
//     isFlat: false
//   })
    client.write('login', {
      ...loginPacket,
        enforcesSecureChat: false,
        entityId: client.id,
        levelType: 'default',
        gameMode: 0,
        previousGameMode: 0,
        worldNames: ["world"],
    //   dimensionCodec: ,
        worldName: "world",
    //   dimension: (serv.supportFeature('dimensionIsAString') || serv.supportFeature('dimensionIsAWorld')) ? serv.registry.loginPacket.dimension : 0,
    //   dimension: 0,
        hashedSeed: [0, 0],
    //   difficulty: serv.difficulty,
        difficulty: 2, // 0: peaceful, 1: easy, 2
        // viewDistance: settings['view-distance'],
        viewDistance: 10,
        reducedDebugInfo: false,
        // maxPlayers: Math.min(255, serv._server.maxPlayers),
        maxPlayers: 20,
        enableRespawnScreen: true,
        isDebug: false,
        // isFlat: settings.generation?.name === 'superflat'
        isFlat: false
    });

    client.write('position', {
        x: 0,
        y: 255,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    })

    // send empty chunk
    client.write('chunk_data', {
        chunkX: 0,
        chunkZ: 0,
        primaryBitMask: 0x00,
        heightmaps: {},
        biomes: [],
        chunkData: Buffer.alloc(0),
        blockEntities: []
    })

//   const message = {
//     translate: 'chat.type.announcement',
//     with: [
//       'Server',
//       'Hello, world!'
//     ]
//   }
//   if (mcData.supportFeature('signedChat')) {
//     client.write('player_chat', {
//       plainMessage: message,
//       signedChatContent: '',
//       unsignedChatContent: chatText(message),
//       type: mcData.supportFeature('chatTypeIsHolder') ? { chatType: 1 } : 0,
//       senderUuid: 'd3527a0b-bc03-45d5-a878-2aafdd8c8a43', // random
//       senderName: JSON.stringify({ text: 'me' }),
//       senderTeam: undefined,
//       timestamp: Date.now(),
//       salt: 0n,
//       signature: mcData.supportFeature('useChatSessions') ? undefined : Buffer.alloc(0),
//       previousMessages: [],
//       filterType: 0,
//       networkName: JSON.stringify({ text: 'me' })
//     })
//   } else {
//     client.write('chat', { message: JSON.stringify({ text: message }), position: 0, sender: 'me' })
//   }
})