const minVersion = 10423; // client

const debug = false;

const PORT = process.env.PORT || 5000;
if (debug) console.log("listening to port", PORT);
const CPUs = require("os").cpus().length;
if (debug) console.log("CPUs", CPUs);

const cluster = require('cluster');
const http = require('http');
const WebSocket = require("ws");
const Player = require("./classes/player");
const GameManager = require('./gameManager');
const DB = require('./database');
const Statistics = require('./statistics');

GameManager.minVersion = minVersion;

const rocket_pool_size = 10;
const max_rocket_power = 100;
const max_player_speed = 70;

var responseTimeout = null;

DB.getLeader();

const server = http.createServer((req, res) => {
    req.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        //
    }).on('end', () => {
        clearTimeout(responseTimeout);
        res.on('error', (err) => {
            console.error(err);
        });
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Expires': new Date().toUTCString()
        });
        responseTimeout = setTimeout(() => {
            res.write(Statistics.output());
            res.end();
        }, 2000);
    })
})

// check host
server.on("upgrade", (request, socket, head) => {
    let agent = request.headers["user-agent"].toLowerCase();
    let origin = request.headers["origin"].toLowerCase();
    if (debug) console.log('header', agent, origin);

    if (!debug) {
        if ((!agent.includes('kaios') || !origin.includes('app://airshipcombat3d')) && !origin.includes('[DOMAIN]' /* domain exception for debugging */)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            console.warn('client refused:', agent, origin);
        }
    }
})

server.listen(PORT);

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    // player connected
    var this_game = null;
    const this_player = new Player();
    this_player.ws = ws;

    var latency_clock = 0;
    var average_latency = 50;

    var connection_lost_timout;
    var free_game_timout;

    if (debug) console.log("==============");

    ws.on("message", data => {
        let request = JSON.parse(data);

        switch (request.do) {
            case "v":
                // check client version
                let check_v = parseInt(request.v) || null;
                if (check_v == null || isNaN(check_v) || check_v > 100000) { error(this_player.ws, true, "client version not valid"); return; }
                if (check_v < minVersion) { error(this_player.ws, true, "game client too old! please update"); return; }
                break;
            case "join":
                if (this_player.game) {
                    this_player.leave(false, true);
                } else {
                    let id = parseInt(request.playerID) || null;
                    if (id == null || isNaN(id) || id < 10000000000000 || id > 9000000000000000) { error(this_player.ws, true, "player id not valid"); return; }
                    this_player.id = id;

                    let ppID = parseInt(request.ppID) || null;
                    if (ppID == null || isNaN(ppID) || ppID > 123456789) { error(this_player.ws, true, "ppID not valid"); return; }
                    this_player.ppID = ppID;

                    let v = parseInt(request.v) || null;
                    if (v == null || isNaN(v) || v > 100000) { error(this_player.ws, true, "client version not valid"); return; }
                    if (v < minVersion) { error(this_player.ws, true, "game client too old! please update"); return; }
                    this_player.v = v;
                }
                if (this_player.id in DB.player_health_store) {
                    this_player.hp = DB.player_health_store[this_player.id];
                    // console.log("set health", this_player.hp)
                }

                let stage = parseInt(request.stage);
                if (isNaN(stage) || stage < 0 || stage > 2) { error(this_player.ws, true, "stage not valid"); return; }
                this_player.stage = stage;

                let nick = request.playerName || '';
                if (nick != '') nick = nick.replace(/[\W_]+/g, "_");
                this_player.nick = nick;

                checkName(this_player, function (err, valid) {
                    if (err) {
                        console.log(err);
                        this_player.nick = '';
                        return;
                    } else if (!valid) {
                        this_player.nick = '';
                        return;
                    }
                    if (debug) console.log("player", this_player.id, this_player.nick, "has joined");

                    // assign a game
                    let requested_gameID = parseInt(request.gameID) || null;
                    if (debug) console.log("requesting gameID", requested_gameID);
                    this_game = GameManager.assign_game(this_player, requested_gameID);
                    if (this_game == null) return;
                    GameManager.update_playerCount();
                    this_player.active = true;

                    // add to db or return score
                    DB.addPlayer(this_player, function (err) {
                        if (err) {
                            error(this_player.ws, false, "cant't access database");
                        } else {
                            let score_message = { "do": "score", "ks": this_player.killScore, "hs": this_player.hitScore, "l": this_player.leader };
                            this_player.ws.send(JSON.stringify(score_message));
                            // send player list with score
                            if (this_game) this_game.send_playerList();
                        }
                    });
                })

                latency_clock = Date.now();
                let jT = parseInt(request.t) || null;
                if (jT == null || isNaN(jT) || jT > 9000000000000) { error(this_player.ws, true, "client time not valid"); return; }
                this_player.t_offset = Date.now() - jT + average_latency; // offset to server time
                break;
            case "nick":
                if (debug) console.log("check nick");
                let check_id = parseInt(request.p) || null;
                if (check_id == null || isNaN(check_id) || check_id > 9000000000000000) { error(this_player.ws, true, "player id not valid"); return; }
                this_player.id = check_id;

                let check_nick = request.n || '';
                if (check_nick != '') {
                    check_nick = check_nick.replace(/[\W_]+/g, "_");
                    this_player.nick = check_nick;

                    checkName(this_player, function (err, valid) {
                        if (err) console.log(err);
                    });
                }
                break;
            case "gameID":
                let check_gameID = parseInt(request.id) || null;
                if (debug) console.log("get stats for gameID", check_gameID);
                let check_game = GameManager.games[check_gameID];
                if (check_game) {
                    // check leader
                    let mp_leader_ppID = 0;
                    for (let i = 0; i < check_game.players.length; i++) {
                        if (check_game.players[i].id == DB.leaderID) {
                            mp_leader_ppID = check_game.players[i].ppID;
                            break;
                        }
                    }
                    game_stats = { "do": "gameStats", "s": check_game.stage, "p": check_game.playerIDs, "sc": check_game.playerScores, "l": mp_leader_ppID }
                } else {
                    game_stats = { "do": "gameStats", "s": -1, "p": null, "sc": null }
                }
                this_player.ws.send(JSON.stringify(game_stats));
                break;
            case "reset":
                if (debug) console.log("player", this_player.id, "reset");

                let reset_pos = request.p || null;
                if (reset_pos == null || !Array.isArray(reset_pos) || reset_pos.length != 3) { error(this_player.ws, true, "player reset error: pos"); return; }
                reset_pos = [parseFloat(request.p[0]), parseFloat(request.p[1]), parseFloat(request.p[2])];

                this_player.reset(reset_pos);
                break;
            case "leave":
                if (debug) console.log("player", this_player.id, "left");
                if (this_player.game) {
                    let old_game_id = this_player.game.id;
                    this_player.leave(false, true);
                    GameManager.update_playerCount();

                    // free game
                    clearTimeout(free_game_timout);
                    free_game_timout = setTimeout(() => {
                        let old_game = GameManager.games[old_game_id];
                        if (old_game && old_game.players.length == 0) old_game.stage = -1;
                    }, 10000)
                }
                break;
            case "t": // measure latency and time offset
                clearTimeout(connection_lost_timout);
                connection_lost_timout = setTimeout(() => {
                    if (this_player.active) {
                        this_player.leave(false, false);
                        ws.close();
                    }
                }, 3000);
                if (request.r) {
                    let slice = (request.s) ? parseInt(request.s) : 0;
                    if (slice < 0 || slice > 19) slice = 0;
                    latency_clock = send_time(this_player, slice);
                } else {
                    latency_clock = (Date.now() - latency_clock) * 0.5;
                    average_latency = Math.min(1000, Math.round(average_latency * 0.6 + latency_clock * 0.4));
                    // console.log(average_latency);
                    this_player.t_latency = average_latency;
                    let t = parseInt(request.t) || null;
                    if (t == null || isNaN(t) || t > 9000000000000) { error(this_player.ws, true, "client time not valid"); return; }
                    this_player.t_offset = Math.round(this_player.t_offset * 0.9 + (Date.now() - t + average_latency) * 0.1); // offset to server time
                }
                break;
            case "pu": // player update
                // this_player.active = true;
                let pos = request.p || null;
                if (pos == null || !Array.isArray(pos) || pos.length != 5) { error(this_player.ws, true, "player update error: pu_p"); return; }
                pos = [parseFloat(request.p[0]), parseFloat(request.p[1]), parseFloat(request.p[2]), parseFloat(request.p[3]), parseFloat(request.p[4])];

                let rot = request.r || null;
                if (rot == null || !Array.isArray(rot) || rot.length != 3) { error(this_player.ws, true, "player update error: pu_r"); return; }
                rot = [parseFloat(request.r[0]), parseFloat(request.r[1]), parseFloat(request.r[2])];

                let trn = request.d || null;
                if (trn == null || !Array.isArray(trn) || trn.length != 2) { error(this_player.ws, true, "player update error: pu_t"); return; }
                trn = [parseFloat(request.d[0]), parseFloat(request.d[1])];

                // parseInt returns null for 0
                let spd = request.s;
                if (spd == null || !Array.isArray(spd) || spd.length != 2) {
                    error(this_player.ws, true, "player update error: pu_s"); return;
                } else if (spd[0] > max_player_speed) {
                    this_player.penalty(1, "speed: " + spd[0]);
                }
                spd = [parseFloat(request.s[0]), parseFloat(request.s[1])]

                let puT = parseInt(request.t) || null;
                if (puT == null || isNaN(puT) || puT > 9000000000000) { error(this_player.ws, true, "player update error: pu_t"); return; }

                this_player.update_player(puT, pos, rot, trn, spd);
                break;
            case "rs": // rocket shot
                let rPos = request.p || null;
                if (rPos == null || !Array.isArray(rPos) || rPos.length != 3) { error(this_player.ws, true, "rocket shot error: rs_p"); return; }
                rPos = [parseFloat(request.p[0]), parseFloat(request.p[1]), parseFloat(request.p[2])];

                let rRot = request.r || null;
                if (rRot == null || !Array.isArray(rRot) || rRot.length != 3) { error(this_player.ws, true, "rocket shot error: rs_r"); return; }
                rRot = [parseFloat(request.r[0]), parseFloat(request.r[1]), parseFloat(request.r[2])];

                let rPow = parseInt(request.f) || null;
                if (rPow == null || isNaN(rPow)) {
                    error(this_player.ws, true, "rocket shot error: rs_f"); return;
                } else if (rPow > max_rocket_power) {
                    this_player.penalty(100, "rocket power: " + rPow);
                }

                // parseInt returns null for 0
                let rSpd = request.s;
                if (rSpd == null || isNaN(rSpd)) {
                    error(this_player.ws, true, "rocket shot error: rs_s"); return;
                } else if (rSpd > 100) {
                    this_player.penalty(100, "rocket speed: " + rSpd);
                }

                let rI = request.i;
                if (rI == null || isNaN(rI) || rI > rocket_pool_size) { error(this_player.ws, true, "rocket shot error: rs_i"); return; }

                this_player.shoot(rI, rPow, rPos, rRot, rSpd);
                break;
            case "maintain":
                GameManager.send_maintenance_message();
                break;
        }
    })

    ws.on("close", () => {
        this_player.leave(false, false);

        if (this_game) {
            if (debug) console.log(this_player.id, "disconnected from game", this_game.id);
        } else {
            if (debug) console.log(this_player.id, "disconnected");
            return;
        }
    })
})

function send_time(player, slice) {
    let latency_clock = Date.now();
    player.ws.send(JSON.stringify({
        "do": "t",
        "t": latency_clock
    }));
    if (!player.active) send_playerCount(player); // legacy
    if (!player.active) send_gameList(player, slice);
    return latency_clock;
}

wss.on('close', function close() {
})

function info(ws, message) {
    let info = { "do": "info", "m": message };
    ws.send(JSON.stringify(info));
}

function confirm(ws, message) {
    let confirm = { "do": "confirm", "m": message };
    ws.send(JSON.stringify(confirm));
}

function error(ws, fatal, message) {
    let error = { "do": "error", "f": fatal, "m": message };
    ws.send(JSON.stringify(error));
    if (fatal) ws.close();
}

function checkName(player, callback) {
    if (player.nick == '') return callback(null, true);

    if (player.nick.length > 10 || player.nick.length < 3) {
        error(player.ws, false, "player name not valid");
        return callback(null, false);
    }
    DB.checkName(player, function (err, valid) {
        if (!err) {
            if (valid) {
                confirm(player.ws, "player name ok");
            } else {
                error(player.ws, false, "player name taken or rejected");
            }
        }
        return callback(err, valid);
    });
}

function send_playerCount(player) {
    player.ws.send(JSON.stringify({
        "do": "pc",
        "pc": GameManager.playerCount
    }));
}

function send_gameList(player, slice) {
    let gamelist = {
        "do": "list",
        "pc": GameManager.totalPlayerCount,
        "p": [],
        "l": []
    };
    let start = slice * 5 + 1;
    let end = start + 4;

    if (end >= GameManager.games.length) return;
    for (let i = start; i <= end; i++) {
        let index = i - slice * 5 - 1; // games start at 1, not 0
        gamelist.p[index] = GameManager.games[i].players.length;
        gamelist.l[index] = GameManager.games[i].stage;
    }

    player.ws.send(JSON.stringify(gamelist));
}

// handler crashes
process.on('uncaughtException', err => {
    server.close(() => {
        process.exit(0)
    })

    console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    console.error(err.stack)

    // If server hasn't finished in 1000ms, shut down process
    setTimeout(() => {
        process.exit(0)
    }, 1000).unref() // Prevents the timeout from registering on event loop
})
