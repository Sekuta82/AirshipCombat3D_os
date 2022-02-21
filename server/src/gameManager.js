const debug = false;

const Game = require("./classes/game");

var gm = {};
gm.minVersion = 0;
gm.playerLimit = 4;
gm.gameLimit = 100;
gm.totalPlayerLimit = gm.gameLimit * gm.playerLimit;
gm.games = [];
gm.activeGameCount = 0;
gm.playerCount = [0, 0, 0]; // 3 stages
gm.totalPlayerCount = 0;

// init games
gm.games[0] = null;
for (let i = 1; i <= gm.gameLimit; i++) {
    if (!gm.games[i] || !(gm.games[i] instanceof Object)) {
        this_game = new Game();
        this_game.id = i;
        this_game.stage = -1; // undefined
        gm.games[i] = this_game;
    }
}

gm.update_playerCount = () => {
    gm.playerCount = [0, 0, 0]; // 3 stages
    gm.totalPlayerCount = 0;
    gm.activeGameCount = 0;

    gm.games.forEach(game => {
        if (!game || !(game instanceof Object)) return;
        game.players.forEach(player => {
            if (player instanceof Object) {
                gm.playerCount[player.stage]++;
                gm.totalPlayerCount++;
            }
        })
        if (game.players.length > 0) {
            gm.activeGameCount++; // count active games
        }
    })
}

gm.assign_game = (player, requestedID) => {
    var this_game = null;
    // join specified ID
    if (requestedID != null && requestedID != 0) {
        if (gm.totalPlayerCount < gm.totalPlayerLimit && requestedID > 0 && requestedID <= gm.gameLimit) {
            if (gm.games[requestedID] instanceof Object) {
                check_duplicate_players(gm.games[requestedID], player);
                // check stage and player limit
                if (player.stage == gm.games[requestedID].stage || gm.games[requestedID].stage == -1) {
                    if (gm.games[requestedID].players.length < gm.playerLimit) {
                        if (gm.games[requestedID].stage == -1) gm.games[requestedID].stage = player.stage;
                        this_game = gm.games[requestedID];
                    } else {
                        game_error(player.ws, false, "game " + requestedID + " full; retrying...");
                        return null;
                    }
                } else {
                    game_error(player.ws, true, "joining game " + requestedID + " not possible; wrong level");
                    return null;
                }
            } else {
                if (debug) console.log("requested game", requestedID, "not active; creating game");
                this_game = new Game();
                this_game.id = requestedID;
                this_game.stage = player.stage;
                gm.games[requestedID] = this_game;
            }
            this_game.players.push(player);
            player.game = this_game;
            this_game.send_join_response(player);
            return this_game;
        } else {
            if (debug) console.log("game already full or max games reached");
            return null;
        }
    }

    let free_game_found = false;

    // find free games
    for (let i = 1; i < gm.games.length; i++) {
        if (gm.games[i] && gm.games[i] instanceof Object) {
            if (debug) console.log("check game", i, 'stage', gm.games[i].stage, 'player.stage', player.stage);
            if (gm.games[i].players.length < gm.playerLimit && (gm.games[i].stage == -1 || player.stage == gm.games[i].stage)) {
                check_duplicate_players(gm.games[i], player);
                // add player to game
                gm.games[i].players.push(player);
                // set stage
                if (gm.games[i].stage == -1) gm.games[i].stage = player.stage;

                // free game found
                if (debug) console.log("free game found", gm.games[i].id);

                this_game = gm.games[i];
                player.game = this_game;
                this_game.send_join_response(player);
                free_game_found = true;
                return this_game;
            }
        }
    }

    if (!free_game_found) {
        // new game
        if (gm.totalPlayerCount >= gm.totalPlayerLimit) {
            game_error(player.ws, true, "server full; please try again later");
            console.warn("maximum games reached!");
            return null;
        }
        let id = Math.max(1, gm.games.length);
        if (debug) console.log("no free game found; creating game", id);
        this_game = new Game();
        this_game.id = id;
        this_game.stage = player.stage;
        this_game.players = [player];
        gm.games[id] = this_game;
        player.game = this_game;
        this_game.send_join_response(player);
    }
    return this_game;
}

function check_duplicate_players(game, player) {
    for (let i = 0; i < game.players.length; i++) {
        if (game.players[i].id == player.id) {
            player.leave(false, false);
        }
    }
    return false;
}

function game_error(ws, fatal, message) {
    let error = { "do": "game_error", "f": fatal, "m": message };
    ws.send(JSON.stringify(error));
}

gm.send_maintenance_message = (type) => {

}

module.exports = gm