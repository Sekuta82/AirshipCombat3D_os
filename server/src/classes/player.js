const THREE = require("three");
const DB = require('../database');

const debug = false;

var is_first_update = true;

const tuna_health = 200;
const max_player_deviation = 10;
const verticalBounds = [0, 500];

const rocket_pool_size = 10;
const max_rocket_power = 100;
const rocket_speed = 400;
const rocket_age = 5;

class Player {
    constructor() {
        this.active = false;
        this.game = null; // game object
        this.stage = 0; // game stage
        this.id = null; // private player ID
        this.ppID = null; // public player ID
        this.v = 0; // client version
        this.nick = ''; // player name
        this.ws = null; // websocket object
        this.t_latency = 50; // connection latency in ms
        this.t_offset = 0; // server offset time in ms
        this.t_pu = 0; // player update time in ms
        this.t_rs = 0; // rocket shot time in ms
        this.pos = new THREE.Vector3(); // position vector
        this.vert = [0, 0]; // [current vertical movement, target vertical movement]
        this.rot = [0, 0, 0] // [rotationY, target rotationY, local rotationX]
        this.trn = [0, 0]; // turning direction
        this.spd = [0, 0]; // [current speed, target speed]
        this.hp = tuna_health;
        this.rockets = []; // rocket objects
        this.heat = 0;
        this.rocketPos = []; // rocket position vectors
        this.killScore = 0; // frags
        this.hitScore = 0; // hits
        this.leader = 0; // leadership
        this.penalties = 0; // penalty score

        // fill rocket pools
        for (let i = 0; i < rocket_pool_size; i++) {
            let rocket = {
                "object": new THREE.Group(),
                "i": i,
                "age": 0,
                "pow": 0,
                "spd": 0
            }
            this.rockets.push(rocket);
        }
    }

    serverTime = 0;
    pu_deltaTime = 0.01;
    prev_time = Date.now();

    prev_pos = new THREE.Vector3();
    position_deviation = 0;

    playerObject = new THREE.Group();


    speed = 0;
    targetSpeed = 0;
    rotationY_velocity = 0;
    targetRotationY = 0;
    verticalMovement_velocity = 0;
    verticalMovement = 0;

    // inactivity_time = 0;

    update_player(t, pos, rot, trn, spd) {
        // this.inactivity_time = 0;
        if (!this.active) return;

        this.serverTime = t + this.t_offset; // convert to server time
        this.t_pu = Math.round(this.serverTime); // store reception time

        this.pu_deltaTime = (t - this.prev_time) * 0.001;
        this.prev_time = t;

        this.pos.set(pos[0], pos[1], pos[2]);
        this.playerObject.position.copy(this.pos);

        this.vert = [pos[3], pos[4]];
        this.verticalMovement_velocity = pos[3];
        this.verticalMovement = pos[4];

        this.trn = trn;

        if (is_first_update) {
            this.prev_pos.set(pos[0], pos[1], pos[2]);
            is_first_update = false;
            return;
        }

        this.spd = spd;
        this.speed = this.spd[0];
        this.targetSpeed = this.spd[1];

        // calculate position deviation
        this.position_deviation = this.playerObject.position.distanceTo(this.pos);
        // console.log("distance to pu pos", Math.round(this.position_deviation));
        if (this.position_deviation > max_player_deviation) {
            let reason = "pos deviation:" + this.position_deviation;
            this.penalty(1, reason);
        }
        this.prev_pos.set(pos[0], pos[1], pos[2]);

        this.rot = rot;
        this.playerObject.rotation.y = this.rotationY_velocity = rot[0]; // world.rotation.y
        this.targetRotationY = rot[1]; // rotation target
    }

    reset(pos) {
        if (!this.game) return;
        this.game.players.forEach(player => {
            if (player.id == this.id) {
                is_first_update = true;
                this.hp = tuna_health;
                DB.player_health_store[this.id] = this.hp;
                // console.log("store health", this.hp)
                this.active = true;
                this.heat = 0;

                this.pos.set(pos[0], pos[1], pos[2]);
                this.prev_pos.set(pos[0], pos[1], pos[2]);
                this.playerObject.position.copy(this.pos);

                this.vert = [0, 0];
                this.verticalMovement_velocity = 0;
                this.verticalMovement = 0;
            }

            player.ws.send(JSON.stringify({
                "do": "reset",
                "p": this.ppID,
                "pos": pos
            }));
        })
    }

    leave(terminate, reset_player) {
        if (this.game) {
            this.game.remove_player(this, terminate);
            this.game = null;
        }
        if (reset_player) {
            this.hp = tuna_health;
            this.heat = 0;
        }
        DB.player_health_store[this.id] = this.hp;
        // console.log("store health", this.hp)
    }

    penalty(points, reason) {
        this.penalties += points;
        console.log(this.id, reason, "| penalty", points, "| total", this.penalties);
    }

    shoot(i, pow, pos, rot, spd) {
        if (!this.active) return;
        this.heat += 100 / rocket_pool_size + pow * 0.1;

        if (this.heat > 150) {
            this.penalty(10, "rocket heat: " + Math.round(this.heat));
        }

        // clamp values
        let index = Math.max(0, Math.min(rocket_pool_size - 1, i));
        let power = Math.max(10, Math.min(max_rocket_power, pow));

        let position = array_to_vector3(pos);
        let distance = position.distanceTo(this.playerObject.position);
        if (distance > 200) {
            this.penalty(10, "rocket launch pos deviation: " + Math.round(distance));
        }
        let rotation = new THREE.Euler(0, 0, 0, "XYZ")
        rotation.set(rot[0], rot[1], rot[2]);
        this.rockets[index].i = i;
        this.rockets[index].age = this.t_latency * 0.001;
        this.rockets[index].pow = power;
        this.rockets[index].spd = spd;
        this.rockets[index].object.position.copy(position);
        this.rockets[index].object.rotation.copy(rotation);


        // push forward to current time
        this.rockets[index].object.translateZ((rocket_speed + spd) * this.t_latency * 0.001);

        // send to other players
        let shot_message = {
            "do": "rs",
            "p": this.ppID,
            "i": i, // rocket index
            "l": this.t_latency, // latency
            "pow": pow, // power
            "pos": pos, // position
            "rot": rot, // rotation
            "spd": spd // speed
        };
        if (!this.game) return;
        this.game.players.forEach(player => {
            if (player.id != this.id) player.ws.send(JSON.stringify(shot_message));
        })
    }


    animate_player(deltaTime) {
        if (!this.active) return;

        let deltaTime_half = deltaTime * 0.5;

        this.speed = THREE.Math.lerp(this.speed, this.targetSpeed, deltaTime * 0.5);

        // move player
        this.playerObject.translateZ(this.speed * deltaTime);

        // rotate player
        if (this.trn[0] != 0) {
            this.targetRotationY -= this.trn[0] * deltaTime;
        }
        this.rotationY_velocity = THREE.Math.lerp(this.rotationY_velocity, this.targetRotationY, deltaTime_half);
        this.playerObject.rotation.y = this.rotationY_velocity;

        if (this.trn[1] != 0 && this.pos.y < verticalBounds[1]) {
            this.verticalMovement = (this.trn[1] > 0) ? 1.0 : -0.7;
        } else {
            this.verticalMovement = 0;
        }

        this.verticalMovement_velocity = THREE.Math.lerp(this.verticalMovement_velocity, this.verticalMovement, deltaTime_half);
        this.playerObject.position.y -= this.verticalMovement_velocity * this.speed * deltaTime;

        // weapon cool down
        if (this.heat > 0) {
            this.heat -= deltaTime * 8;
        }
    }

    animate_rockets(deltaTime) {
        // rockets
        this.rocketPos = [];
        for (let j = 0; j < Object.keys(this.rockets).length; j++) {
            if (this.rockets[j].spd > 0) {
                // check age
                if (this.rockets[j].age > rocket_age) {
                    this.rockets[j].spd = 0;
                } else {
                    this.rockets[j].age += deltaTime;
                }
                // move rocket
                this.rockets[j].object.translateZ((rocket_speed + this.rockets[j].spd) * deltaTime);

                this.rocketPos.push({
                    "i": Object.keys(this.rockets)[j],
                    "pos": vector3_to_array(this.rockets[j].object.position)
                })

                // check collisions
                let distance = 0;

                if (!this.game) return;
                this.game.players.forEach(player => {
                    if (player.id == this.id) return;
                    if (!player.active) return;

                    distance = this.rockets[j].object.position.distanceTo(player.pos);
                    if (distance > -5 && distance < 15) {
                        // console.log("player hit", player.id);
                        this.rockets[j].spd = 0;
                        // console.log(this.rockets[j].pow, player.hp);
                        player.hp -= this.rockets[j].pow;
                        DB.player_health_store[player.id] = player.hp;
                        // console.log("update health", player.hp)
                        if (player.hp <= 0) {
                            player.active = false;
                            player.pos.set(0, -1000, 0);
                            player.playerObject.position.copy(player.pos);
                            player.spd = [0, 0];
                            player.vert = [0, 0];
                            this.killScore++;
                            player.hitScore++;
                            DB.kill(this.id, player.id, function (err) {
                                if (err) error(this.ws, false, "cant't access database");
                            })
                        }

                        // move closer to target
                        this.rockets[j].object.translateZ(distance);

                        this.game.update_playerScores();

                        let message = {
                            "do": "hit",
                            "p": this.ppID, // owner id
                            "pn": this.nick, // owner nick
                            "t": player.ppID, // target id
                            "tn": player.nick, // target nick
                            "hp": player.hp,
                            "i": this.rockets[j].i, // rocket index
                            "pow": this.rockets[j].pow,
                            "pos": vector3_to_array(this.rockets[j].object.position),
                            "s": this.game.playerScores
                        }
                        this.game.players.forEach(player => {
                            player.ws.send(JSON.stringify(message));
                        })
                    }

                })
            }
        }
    }
}

function array_to_vector3(array) {
    return new THREE.Vector3(parseFloat(array[0]), parseFloat(array[1]), parseFloat(array[2]));
}

function vector3_to_array(vector3) {
    // prepare for sending
    return [Math.round(vector3.x * 10) * 0.1, Math.round(vector3.y * 10) * 0.1, Math.round(vector3.z * 10) * 0.1];
}

module.exports = Player;