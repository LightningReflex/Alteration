import { ServerClient } from "minecraft-protocol";
import logger from "../../../utils/Logger";
import Handler from "./Handler";
import { Bot } from "mineflayer";

type Score = { // score to add to map of ScoreboardObjective
    itemName: string;
    value: number;
    display_name?: object; // anonymousNbt
    number_format?: number; // varint
    styling?: object; // anonymousNbt, if number_format is 1 or 2
};

type ScoreboardObjective = {
    // packet_scoreboard_objective
    name: string;
    displayText: object; // anonymousNbt
    type: number;
    number_format: number;
    styling: object; // anonymousNbt

    // packet_scoreboard_display_objective
    position: number;

    // packet_scoreboard_score
    scores: Score[]; // Optional, only if scores are set
};

type ScoreboardObjectivePacket = { action: number } & Omit<ScoreboardObjective, "position" | "scores">;
type ScoreboardDisplayObjectivePacket = { position: number; name: string };

// packet_scoreboard_score:
//       itemName: string
//       scoreName: string
//       value: varint
//       display_name?: anonymousNbt
//       number_format?: varint
//       styling: number_format ?
//          if 1: anonymousNbt
//          if 2: anonymousNbt
//          default: void
type ScoreboardScorePacket = {
    itemName: string;
    scoreName: string;
    value: number;
    display_name?: object; // anonymousNbt
    number_format?: number; // varint
    styling?: object; // anonymousNbt, if number_format is 1 or 2
};

type ResetScorePacket = {
    entity_name: string;
    // marked as optional, but no clue why:
    // https://github.com/PrismarineJS/minecraft-data/blob/master/data/pc/1.20.5/proto.yml#L1879
    score_name?: string;
};

export default class ScoreboardsHandler extends Handler {
    private scoreboardObjectives: ScoreboardObjective[] = [];

    protected onInit(): void {
        const bot: Bot = this.botAccount.bot!;

        // Clear data
        this.scoreboardObjectives = [];

        bot._client.on("scoreboard_objective", (packet: ScoreboardObjectivePacket) => {
            if (packet.action === 0) {
                this.scoreboardObjectives.push({
                    name: packet.name,
                    displayText: packet.displayText,
                    type: packet.type,
                    number_format: packet.number_format,
                    styling: packet.styling,
                    position: -1, // Not set yet, will be set in display_objective
                    scores: [],
                });
            }

            if (packet.action === 1) {
                this.scoreboardObjectives = this.scoreboardObjectives.filter(obj => obj.name !== packet.name);
            }

            if (packet.action === 2) {
                const existingObjective = this.scoreboardObjectives.find(obj => obj.name === packet.name);
                if (existingObjective) {
                    existingObjective.displayText = packet.displayText;
                }
            }
        });

        bot._client.on("scoreboard_score", (packet: ScoreboardScorePacket) => {
            const scoreboard = this.scoreboardObjectives.find(obj => obj.name === packet.scoreName);
            // always add, action doesn't exist on 1.20.6
            if (scoreboard) {
                const existingScore = scoreboard.scores.find(score => score.itemName === packet.itemName);
                if (existingScore) {
                    existingScore.value = packet.value;
                    existingScore.display_name = packet.display_name;
                    existingScore.number_format = packet.number_format ?? 0; // Default to 0 if not provided
                    existingScore.styling = packet.styling;
                } else {
                    scoreboard.scores.push({
                        itemName: packet.itemName,
                        value: packet.value,
                        display_name: packet.display_name,
                        number_format: packet.number_format ?? 0, // Default to 0 if not provided
                        styling: packet.styling,
                    });
                }
            } else {
                logger.warn(`Received score for unknown scoreboard ${packet.scoreName}`);
            }
        });

        bot._client.on("reset_score", (packet: ResetScorePacket) => {
            const scoreboard = this.scoreboardObjectives.find(obj => obj.name === packet.score_name);
            if (scoreboard) {
                const scoreIndex = scoreboard.scores.findIndex(score => score.itemName === packet.entity_name);
                if (scoreIndex !== -1) {
                    scoreboard.scores.splice(scoreIndex, 1);
                } else {
                    logger.warn(`Score for ${packet.entity_name} not found in scoreboard ${packet.score_name}`);
                }
            }
        });

        bot._client.on("scoreboard_display_objective", (packet: ScoreboardDisplayObjectivePacket) => {
            const existingObjective = this.scoreboardObjectives.find(obj => obj.name === packet.name);
            if (existingObjective) {
                existingObjective.position = packet.position;
            } else {
                logger.warn(`Received display objective for unknown scoreboard ${packet.name}`);
            }
        });
    }

    public sendScoreboardsToClient(client: ServerClient) {
        const bot: Bot = this.botAccount.bot!;
        // First create the objectives, then display them, then send the scores
        this.scoreboardObjectives.forEach(objective => {
            client.write("scoreboard_objective", {
                action: 0, // Create objective
                name: objective.name,
                displayText: objective.displayText,
                type: objective.type,
                number_format: objective.number_format,
                styling: (objective.number_format === 1 || objective.number_format === 2) ? objective.styling : undefined,
            });

            client.write("scoreboard_display_objective", {
                position: objective.position,
                name: objective.name,
            });

            // Send scores for this objective
            objective.scores.forEach(score => {
                client.write("scoreboard_score", {
                    itemName: score.itemName,
                    scoreName: objective.name,
                    value: score.value,
                    display_name: score.display_name,
                    number_format: score.number_format,
                    styling: score.styling,
                });
            });
        });
    }
}
