const mysql = require('mysql');
const Filter = require('bad-words'),
    filter = new Filter();

const debug = false;

const db_config = {
    connectionLimit: 100, // ask your hoster
    host: "?",
    user: "?",
    password: "?",
    database: "?"
}

var db = {};

db.player_health_store = {};
db.leaderID = 0;

var pool = mysql.createPool(db_config).on('error', function (err) {
    console.log('db error: ' + err.toString());
});

db.addPlayer = (player, callback) => {
    var date = Date.now();
    pool.query('SELECT `player`, `kills`, `hits`, `nick`, `leader` FROM `online_score` WHERE player = ' + player.id, function (error, results, fields) {
        if (error) return callback(error);
        if (results.length == 0) {
            // adding player
            player.killScore = player.hitScore = 0;
            pool.query('INSERT INTO `online_score` (player, nick, v, date) VALUES (\"' + player.id + '\", \"' + player.nick + '\", \"' + player.v + '\", \"' + date + '\")');
            return callback(null);
        } else {
            // get scores
            player.killScore = results[0].kills;
            player.hitScore = results[0].hits;
            player.leader = results[0].leader;

            //update name
            if (results[0].nick != player.nick) {
                pool.query('UPDATE `online_score` SET nick = \"' + player.nick + '\", v = \"' + player.v + '\", date = \"' + date + '\" WHERE `online_score`.player = \"' + player.id + '\"');
                // console.log('db updated');
            }
            // console.log(results);
            return callback(null);
        }
    });
}

db.checkName = (player, callback) => {
    if (debug) console.log("check nick", player.id, player.nick);
    // check for bad words
    let is_name_bad = filter.isProfane(player.nick);
    if (is_name_bad) return callback(null, false);

    // check DB
    pool.query('SELECT `player`, `nick` FROM `online_score` WHERE nick = \"' + player.nick + '\"', function (error, results, fields) {
        if (error) return callback(error, false);
        // if (debug) console.log('results', results);
        if (results.length == 0) {
            return callback(null, true);
        } else {
            if (results[0].player != player.id) {
                if (debug) console.log('name taken');
                return callback(null, false);
            } else {
                if (debug) console.log('name free or own');
                return callback(null, true);
            }
        }
    })
}

db.kill = (id, targetID, callback) => {
    var date = Date.now();
    pool.query('SELECT `player`, `kills` FROM `online_score` WHERE player = ' + id, function (error, results, fields) {
        if (error) return callback(error);
        if (results.length > 0) {
            let kills = results[0].kills + 1;
            pool.query('UPDATE `online_score` SET kills = \"' + kills + '\", date = \"' + date + '\" WHERE `online_score`.player = \"' + id + '\"');
            if (debug) console.log('kills', id, results[0].kills);
        }
    });
    pool.query('SELECT `player`, `hits` FROM `online_score` WHERE player = ' + targetID, function (error, results, fields) {
        if (error) return callback(error);
        if (results.length > 0) {
            let hits = results[0].hits + 1;
            pool.query('UPDATE `online_score` SET hits = \"' + hits + '\", date = \"' + date + '\" WHERE `online_score`.player = \"' + targetID + '\"');
            if (debug) console.log('hits', targetID, results[0].hits);
        }
    });

    // determin leader
    pool.query('SELECT `player`, `kills`, `leader` FROM `online_score` LIMIT 2', function (error, results, fields) {
        if (error) return callback(error);
        if (results.length > 0) {
            let isNewLeader = results[0].kills - results[1].kills;
            // new leader
            if (isNewLeader < 0 ||
                results[1].leader == 1 ||
                (results[0].leader == 0 && results[1].leader == 0)) {
                // sort table
                pool.query('ALTER TABLE `online_score` ORDER BY `kills` DESC');

                // remove old leader
                pool.query('SELECT `player`, `leader` FROM `online_score` WHERE `leader` = 1 LIMIT 1', function (error, results, fields) {
                    if (error) return callback(error);
                    if (results.length > 0) {
                        pool.query('UPDATE `online_score` SET leader = 0 WHERE `online_score`.player = \"' + results[0].player + '\"');
                    }
                });
                // assign new leader
                pool.query('SELECT `player`, `leader` FROM `online_score` LIMIT 1', function (error, results, fields) {
                    if (error) return callback(error);
                    if (results.length > 0) {
                        pool.query('UPDATE `online_score` SET leader = 1 WHERE `online_score`.player = \"' + results[0].player + '\"');
                    }
                });
            }
        }
        db.getLeader();
    });
}

db.getLeader = () => {
    pool.query('SELECT `player`, `leader` FROM `online_score` WHERE `leader` = 1 LIMIT 1', function (error, results, fields) {
        if (error) return;
        if (results.length > 0) {
            db.leaderID = results[0].player;
            // console.log('leader is', db.leaderID);
        }
    });
}

db.ban = (player) => {
    if (debug) console.log("ban player", player.id, player.nick);
    pool.query('SELECT `player`, `bans` FROM `online_score` WHERE player = ' + player.id, function (error, results, fields) {
        if (error) return;
        if (results.length > 0) {
            let bans = results[0].bans + 1;
            pool.query('UPDATE `online_score` SET bans = \"' + bans + '\" WHERE `online_score`.player = \"' + player.id + '\"');
            if (debug) console.log('bans', player.id, results[0].bans);
        }
    });
}

module.exports = db