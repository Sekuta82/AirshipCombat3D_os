const GameManager = require('./gameManager');

var stats = {};

stats.output = () => {
    var client_version = '0' + GameManager.minVersion.toString();
    var client_version_array = client_version.match(/.{1,2}/g);
    var client_version_string = parseInt(client_version_array[0]).toString() + '.' + parseInt(client_version_array[1]).toString() + '.' + parseInt(client_version_array[2]).toString();

    let gamelist = '';
    GameManager.games.forEach((game, i) => {
        if (!(game instanceof Object)) return;
        gamelist += '<p>' + i + ' | stage: ' + game.stage + ' | players: ' + game.players.length + '</p>';
    })
    let page = `<html><meta charset="utf-8"><head></head><body>
<h1>AirshipCombat 3D - Server</h1>
<h2>Server info</h2>
<p>minimum client version: ` + client_version_string + `</p>
<p>player count: ` + GameManager.playerCount + `</p>
<p>active games: ` + GameManager.activeGameCount + `</p>`
        + gamelist +
        `</body></html>`
    return page;
}

module.exports = stats;