import { ServerClient } from "minecraft-protocol";
import { LogType } from "../BotAccount";
import Handler from "./Handler";
import { Bot } from "mineflayer";

type Team = {
    team: string;
    name: object; // anonymousNbt
    friendlyFire: number;
    nameTagVisibility?: string;
    collisionRule?: string;
    formatting?: number;
    prefix?: object; // anonymousNbt
    suffix?: object; // anonymousNbt
    players?: string[];
}

type TeamsPacket = { mode: number } & Team;

export default class TeamsHandler extends Handler {
    private teams: Team[] = [];

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;

        // Clear data
        this.teams = [];

        if (bot.supportFeature('teamUsesScoreboard')) {
            bot._client.on('scoreboard_team', this.teamHandler.bind(this));
        } else { // 1.20.6 uses teams (not sure from which version and up)
            bot._client.on('teams', this.teamHandler.bind(this));
        }
    }

    private teamHandler(packet: TeamsPacket) {
        const mode = packet.mode;
        const existingTeam = this.teams.find(team => team.team === packet.team);
        if (mode === 0) { // Create or update team
            this.teams.push({
                team: packet.team,
                name: packet.name,
                friendlyFire: packet.friendlyFire,
                nameTagVisibility: packet.nameTagVisibility,
                collisionRule: packet.collisionRule,
                formatting: packet.formatting,
                prefix: packet.prefix,
                suffix: packet.suffix,
                players: packet.players,
            });
        }
        if (existingTeam) {
            if (mode === 1) { // Remove team
                this.teams = this.teams.filter(team => team.team !== packet.team);
            }
            if (mode === 2)  { // Update team
                existingTeam.name = packet.name;
                existingTeam.friendlyFire = packet.friendlyFire;
                existingTeam.nameTagVisibility = packet.nameTagVisibility;
                existingTeam.collisionRule = packet.collisionRule;
                existingTeam.formatting = packet.formatting;
                existingTeam.prefix = packet.prefix;
                existingTeam.suffix = packet.suffix;
                // Players isn't updateed by mineflayer, so I hope it is meant to be like this
            }
            if (Array.isArray(packet.players)) {
                if (mode === 3) { // Add players to team
                    existingTeam.players = existingTeam.players ? [...existingTeam.players, ...packet.players] : packet.players;
                }
                if (mode === 4) { // Remove players from team
                    existingTeam.players = existingTeam.players ? existingTeam.players.filter(player => !packet.players!.includes(player)) : [];
                }
            }
        }
    }

    public sendTeamsToClient(client: ServerClient) {
        this.teams.forEach(team => {
            // packet_teams:
            //     team: string
            //     mode: i8
            //     name: mode ?
            //         if 0: anonymousNbt
            //         if 2: anonymousNbt
            //         default: void
            //     friendlyFire: mode ?
            //         if 0: i8
            //         if 2: i8
            //         default: void
            //     nameTagVisibility: mode ?
            //         if 0: string
            //         if 2: string
            //         default: void
            //     collisionRule: mode ?
            //         if 0: string
            //         if 2: string
            //         default: void
            //     formatting: mode ?
            //         if 0: varint
            //         if 2: varint
            //         default: void
            //     prefix: mode ?
            //         if 0: anonymousNbt
            //         if 2: anonymousNbt
            //         default: void
            //     suffix: mode ?
            //         if 0: anonymousNbt
            //         if 2: anonymousNbt
            //         default: void
            //     players: mode ?
            //         if 0: string[]varint
            //         if 3: string[]varint
            //         if 4: string[]varint
            //         default: void
            client.write("teams", {
                team: team.team,
                mode: 0, // Create or update team
                name: team.name,
                friendlyFire: team.friendlyFire,
                nameTagVisibility: team.nameTagVisibility,
                collisionRule: team.collisionRule,
                formatting: team.formatting,
                prefix: team.prefix,
                suffix: team.suffix,
                players: team.players || [],
            });
        });
    };
}
