const debug = false;

const THREE = require("three");
const DB = require('../database');

const playerLimit = 4;
penalty_limit = 100;

const broadcast_refreshRate = 20; // every x cycle

class Game {
    constructor(id, players) {
        this.id = id || null;
        this.type = "deathmatch";
        this.stage = 0;
        this.players = players || [];
        this.deltaTime = 0.01;
    }

    clock = new THREE.Clock(true);

    send_join_response(player) {
        // send to player
        let join_message = { "do": "join", "gameID": this.id };
        player.ws.send(JSON.stringify(join_message));

        // logging
        if (debug) {
            var log_message = "assigning " + player.id + " to game: " + this.id + '; ';
            log_message += "players in game: " + this.players.length + '; ';
            console.log(log_message);
        }
    }

    remove_player(player, terminate) {
        this.players.forEach((e, i) => {
            if (e.id == player.id) {
                player.active = false;
                this.players.splice(i, 1);
                this.send_playerList();

                if (terminate) {
                    // console.log("terminate connection");
                    player.ws.terminate();
                }
            }
        })
    }

    playerIDs = [];
    playerScores = [];
    // distance_between_players = [];
    player_activeStates = [];
    player_positions = [];
    player_rotations = [];
    player_trns = [];
    player_speeds = [];
    player_rocket_positions = [];
    player_stats = {};

    update_counter = 0;

    animate() {
        this.update_counter++;
        this.deltaTime = this.clock.getDelta();

        // update game
        this.player_activeStates = [];
        this.player_positions = [];
        this.player_rotations = [];
        this.player_trns = [];
        this.player_speeds = [];
        this.player_rocket_positions = [];

        this.players.forEach((player, i) => {
            player.animate_player(this.deltaTime);

            this.player_activeStates[i] = player.active ? 1 : 0;
            this.player_positions[i] = vector3_to_array(player.playerObject.position);
            this.player_positions[i][3] = player.verticalMovement_velocity.toFixed(1);
            this.player_positions[i][4] = player.verticalMovement.toFixed(1);
            this.player_rotations[i] = [player.rotationY_velocity.toFixed(2), player.targetRotationY.toFixed(2), player.rot[2]];
            this.player_trns[i] = player.trn;
            this.player_speeds[i] = [player.speed.toFixed(1), player.targetSpeed.toFixed(1)];

            // check for cheaters
            if (player.penalties > penalty_limit) {
                // kick player
                let error = { "do": "error", "f": "true", "m": "player banned" };
                player.ws.send(JSON.stringify(error));
                DB.ban(player);
                this.remove_player(player, true);
            }

            // rockets
            player.animate_rockets(this.deltaTime);
            this.player_rocket_positions[i] = player.rocketPos;
            // console.log(this.player_rocket_positions[i]);
        })
 
        // broadcast to everyone in the game
        if (this.update_counter == broadcast_refreshRate) {
            this.update_counter = 0;
            if (this.players.length > 1) this.broadcast();
        }
    }

    broadcast() {
        this.player_stats = { "do": "pu" };
        this.player_stats.a = this.player_activeStates;
        this.player_stats.p = this.player_positions;
        this.player_stats.r = this.player_rotations;
        this.player_stats.d = this.player_trns;
        this.player_stats.s = this.player_speeds;
        this.player_stats.rp = this.player_rocket_positions;
        this.player_stats.pl = this.playerIDs;
        
        this.players.forEach((player) => {
            if (this.players.length > 1) {
                // send game state
                player.ws.send(JSON.stringify(this.player_stats));
            }
        })
        if (debug) console.log("broadcasting to game", this.id, this.stage);
    }

    update_playerList() {
        this.playerIDs = [];
        this.players.forEach((player) => {
            this.playerIDs.push({ "ppID": player.ppID, "nick": player.nick });
        })
    }

    update_playerScores() {
        this.playerScores = [];
        this.players.forEach((player) => {
            this.playerScores.push(player.killScore);
        })
    }

    send_playerList() {
        let mp_leader_ppID = 0;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == DB.leaderID) {
                mp_leader_ppID = this.players[i].ppID;
                break;
            }
        }

        this.update_playerList();
        this.update_playerScores();
        let player_list = {
            "do": "pl",
            "p": this.playerIDs,
            "s": this.playerScores,
            "l": mp_leader_ppID
        };
        this.animate();
        this.players.forEach((player) => {
            player.ws.send(JSON.stringify(player_list));
        })
    }
}

function vector3_to_array(vector3) {
    // prepare for sending
    return [vector3.x.toFixed(1), vector3.y.toFixed(1), vector3.z.toFixed(1)];
}

module.exports = Game;