(function (app) {

    document.addEventListener('keyup', handleKeyUp);

    const tuna_health = 200;
    var player_visible = false;

    var latency_clock = 0;
    var average_latency = 50;
    var latency_timer = null;

    var client_node = document.getElementById("mp_client");
    var status_node = document.getElementById("mp_status");
    var latency_node = document.getElementById("mp_latency");
    var bandwidth_node = document.getElementById("mp_bandwidth");
    var players_node = document.getElementById("mp_players");
    var instruct_node = document.getElementById("mp_instruct");
    var lobby_message_node = document.getElementById("lobby_message");
    var lobby_stage_node = document.getElementById("lobby_stage");

    var playerID;
    var publicPlayerID = Math.ceil(Math.random() * 12345678);
    app.gameID = null;

    var local_rotationX_velocity = [];
    var local_rotationX = [];
    var player_targetRotationY = [];
    var player_targetSpeed = [];
    var player_rotationY_velocity = [];
    var verticalMovement = [];
    var verticalMovement_velocity = [];

    var player_list = [];
    var player_list_nodes = [];
    var player_scores = [];
    var player_activeStates = [];
    var player_positions = [];
    var player_rotations = [];
    var player_trns = [];
    var player_speeds = [];
    var rocket_positions = [];

    app.badwidth_in = 0;
    app.badwidth_out = 0;

    var isFatalError = false;
    var reconnect_counter = 0;
    var reconnection_timeout;
    var rejoin_counter = 0;
    var rejoin_timeout;
    app.connection_lost_timout;

    app.ws = null;

    app.connect = (autojoin) => {
        clearTimeout(app.connection_lost_timout);
        app.populateList();
        average_latency = 50;
        if (app.mp_connected) return;
        if (app.ws) app.ws.close();
        isFatalError = false;

        app.ws = new WebSocket(app.mp_server);

        status_node.innerHTML = lobby_message_node.innerHTML = "connecting...";
        app.ws.onopen = () => {
            reconnect_counter = 0;
            rejoin_counter = 0;
            latency_clock = Date.now();

            app.mp_connected = true;
            status_node.innerHTML = lobby_message_node.innerHTML = "connection opened"
            status_node.innerHTML += "<br/>";

            let check_version = JSON.stringify({
                "do": "v",
                "v": app.version
            });
            app.ws.send(check_version);

            app.release_join();

            if (app.autoplay || autojoin) {
                app.join();
            }
            send_time(true);
        }

        app.ws.onmessage = (e) => {
            // console.log("message", e.data);
            app.badwidth_in += app.getUTF8Size(e.data);
            let message = JSON.parse(e.data);
            // console.log("do", message.do);
            switch (message.do) {
                case "join":
                    rejoin_counter = 0;
                    app.mp_joined = true;
                    app.gameID = parseInt(message.gameID);

                    if (!app.playerKilled) {
                        player_visible = true;
                        app.send_mp_update();
                    }

                    status_node.innerHTML = 'connected to game # ' + message.gameID;
                    break;
                case "list":
                    app.updateList(message.pc, message.p, message.l);
                    break;
                case "score":
                    app.playerObject.killScore = parseInt(message.ks);
                    app.playerObject.hitScore = parseInt(message.hs);
                    app.playerObject.mpLeader = parseInt(message.l);
                    app.file_read(true);
                    app.refresh_mp_score(true);
                    break;
                case "gameStats":
                    let stats_players = message.p;
                    let stats_scores = message.sc;
                    app.mp_leader_ppID = message.l;
                    // stage
                    let server_stage = parseInt(message.s);
                    if (server_stage == -1) {
                        app.mp_stage = parseInt(app.setSelectByValue(lobby_stage_node));
                    } else {
                        app.mp_stage = parseInt(message.s);
                    }
                    app.level_mp_deathmatch.stageIndex = app.mp_stage;

                    app.display_gameStats(stats_players, stats_scores);
                    break;
                case "reset":
                    // self
                    if (message.p == publicPlayerID) {
                        player_visible = true;
                        app.playerKilled = false;
                    } else {
                        app.mp_player_pool.forEach(player => {
                            if (player.ppID == message.p) {
                                let i = player.index;
                                player.active = true;
                                player.object.visible = true;

                                player.object.position.set(parseFloat(player_positions[i][0]), parseFloat(player_positions[i][1]), parseFloat(player_positions[i][2]));
                                verticalMovement_velocity[i] = 0;
                                verticalMovement[i] = 0;
                            }
                        })
                    }
                    break;
                case "info":
                    status_node.innerHTML = lobby_message_node.innerHTML = message.m;
                    players_node.innerHTML = '';
                    break;
                case "confirm":
                    status_node.innerHTML = lobby_message_node.innerHTML = message.m;
                    players_node.innerHTML = '';
                    app.release_join();
                    break;
                case "error":
                    status_node.innerHTML = lobby_message_node.innerHTML = message.m;
                    isFatalError = message.f;
                    players_node.innerHTML = '';
                    app.prevent_join();
                    break;
                case "game_error":
                    app.mp_joined = false;
                    app.reset_onlinePlayers();
                    status_node.innerHTML = lobby_message_node.innerHTML = message.m;
                    players_node.innerHTML = '';
                    let fatal = message.f;
                    if (!app.inMenu && !fatal && rejoin_counter < 100) {
                        rejoin_timeout = setTimeout(() => {
                            status_node.innerHTML = rejoin_counter;
                            app.join();
                            rejoin_counter++;
                            console.log("re-joining", app.gameID);
                        }, 2345)
                    }
                    break;
                case "t": // measure latency
                    latency_clock = (Date.now() - latency_clock) * 0.5;
                    average_latency = Math.min(1000, Math.round(average_latency * 0.8 + latency_clock * 0.2));
                    latency_node.innerHTML = "ping " + average_latency;

                    clearTimeout(app.connection_lost_timout);
                    app.connection_lost_timout = setTimeout(() => {
                        if (app.ws && !app.isInputFocused) {
                            latency_node.innerText = "---";
                            app.ws.close();
                        }
                    }, 4000);

                    send_time(false); //don't request responde
                    if (average_latency > 500) {
                        latency_node.innerText = "---";
                        app.ws.close();
                    }
                    latency_timer = setTimeout(send_time, 1000, true); // request responde
                    break;
                case "pl": // player list
                    player_list = message.p;
                    player_scores = message.s;
                    app.mp_leader_ppID = message.l;
                    player_list_nodes = [];
                    players_node.innerHTML = "Players: ";
                    app.assign_onlinePlayers();
                    player_list.forEach((player, i) => {
                        let p = document.createElement("span");
                        if (player.ppID == publicPlayerID) {
                            p.className = 'this';
                        }

                        // leader badge
                        if (app.mp_leader_ppID == player.ppID) {
                            app.showBadges(p, 0, 'hud', 1);
                        }

                        p.innerHTML += (player.nick != '') ? player.nick : '#' + player.ppID;
                        if (i < player_list.length - 1) p.innerHTML += ', ';
                        player_list_nodes.push(p);
                        players_node.appendChild(p);
                    })
                    break;
                case "pu": // player update
                    if (app.playerKilled) return;
                    player_list = message.pl;
                    player_activeStates = message.a;
                    player_positions = message.p;
                    player_rotations = message.r;
                    player_trns = message.d;
                    player_speeds = message.s;
                    rocket_positions = message.rp;

                    update_onlinePlayers();
                    update_onlineRockets();
                    break;
                case "rs": // rocket launched
                    if (app.playerKilled) return;
                    let i = palyerID_to_index(message.p);
                    let combined_latency = parseInt(message.l) + average_latency;
                    app.shoot_mp_rocket(
                        message.pos,
                        message.rot,
                        i, // player index
                        parseInt(message.i), // rocket index
                        parseInt(message.pow),
                        parseInt(message.spd),
                        combined_latency
                    );
                    // console.log("fire!!1", message);
                    break;
                case "hit": // player hit
                    player_scores = message.s;
                    if (app.playerKilled) return;
                    app.spawn_smallExplosion(10, 50, array_to_vector3(message.pos), 1);
                    // rocket owner
                    if (message.p == publicPlayerID) {
                        let ri = parseInt(message.i);
                        let rocket = app.playerRocket_pool[ri];
                        app.remove_playerRocket(rocket);
                    } else {
                        let pIndex = palyerID_to_index(message.p);
                        let ri = pIndex * 10 + parseInt(message.i);
                        let rocket = app.mp_rocket_pool[ri];
                        app.remove_mp_rocket(rocket);
                    }

                    // update health
                    if (message.t == publicPlayerID) {
                        app.playerObject.health = message.hp;
                    }
                    // player killed
                    if (message.hp <= 0) {
                        // killed me
                        let killer_name = (message.pn != '') ? message.pn : message.p;
                        if (message.t == publicPlayerID) {
                            app.playerObject.health = 0;
                            player_visible = false;
                            app.playerKilled = true;
                            app.playerObject.hitScore++;
                            app.refresh_mp_score(false);
                            app.set_ticker('destroyed by ' + killer_name);
                            instruct_node.innerText = 'Press * to reset';
                            // increase score of opponent
                            app.mp_player_pool.forEach(player => {
                                if (player.ppID == message.p) {
                                    player.score++;
                                }
                            })
                        } else {
                            // killed someone else
                            let target_name = (message.tn != '') ? message.tn : message.t;
                            app.set_ticker(killer_name + ' -=> ' + target_name);
                            // killed by me
                            if (message.p == publicPlayerID) {
                                app.playerObject.killScore++;
                                app.file_read(true);
                                app.refresh_mp_score(true);
                            }
                            // disable player
                            app.mp_player_pool.forEach(player => {
                                if (player.ppID == message.t) {
                                    player.active = false;
                                    player.object.visible = false;
                                    player.object.position.copy(app.instance_parkingPosition);
                                }
                            })
                        }
                    }
                    // console.log(message);
                    break;
            }
        }

        app.ws.onerror = () => {
            app.mp_connected = false;
            status_node.innerHTML += "<br/>";
            status_node.innerHTML += "websocket error";
            lobby_message_node.innerHTML += "<br/>";
            lobby_message_node.innerHTML += "websocket error";
            players_node.innerHTML = '';
        }

        app.ws.onclose = () => {
            app.mp_connected = false;
            app.prevent_join();
            app.reset_onlinePlayers();
            app.lobby_slice = 0;
            if (reconnect_counter < 5) {
                reconnect(app.mp_joined);
            } else {
                status_node.innerHTML = "can't connect. try again later";
                lobby_message_node.innerHTML = "can't connect. try again later";
            }
            app.mp_joined = false;
            status_node.innerHTML += "<br/>";
            status_node.innerHTML += "websocket closed";
            lobby_message_node.innerHTML += "<br/>";
            lobby_message_node.innerHTML += "websocket closed";
            // console.log("websocket closed")
            players_node.innerHTML = '';
        }
    }

    app.join = () => {
        if (rejoin_timeout) clearTimeout(rejoin_timeout);
        if (!app.mp_joined) {
            app.init_onlinePlayers();
            client_node.innerText = "player: " + publicPlayerID + " | " + app.playerName;
            document.title = playerID; // debug
        }

        let connection_request = JSON.stringify({
            "do": "join",
            "v": app.version,
            "t": Date.now(),
            "stage": app.mp_stage,
            "gameID": app.gameID || null,
            "playerID": playerID,
            "ppID": publicPlayerID,
            "playerName": app.playerName
        });
        app.ws.send(connection_request);
        app.badwidth_out += app.getUTF8Size(connection_request);
    }

    app.leave_game = () => {
        clearTimeout(app.connection_lost_timout);
        app.gameID = null;
        app.mp_joined = false;
        if (app.mp_connected) app.ws.send(JSON.stringify({ "do": "leave" }));
    }

    app.switch_server = () => {
        reconnect_counter = 0;
        if (app.ws) app.ws.close();
    }

    app.init_onlinePlayers = function () {
        if (app.mp_player_pool.length > 0) return;
        app.init_mp_rockets();

        if (app.mp_random_playerID) {
            playerID = parseInt("9" + Math.round(new Date().getTime()));
        } else {
            if (app.playerID == null) app.init_playerID();
            playerID = app.playerID;
        }

        // fill player pool
        for (let i = 0; i < app.mp_playerLimit; i++) {
            var onlinePlayer = spawn_onlinePlayer(i);
            onlinePlayer.object.visible = false;
            app.mp_player_pool.push(onlinePlayer);

            // init array
            local_rotationX[i] =
                local_rotationX_velocity[i] =
                player_targetRotationY[i] =
                player_targetSpeed[i] =
                player_rotationY_velocity[i] =
                verticalMovement[i] =
                verticalMovement_velocity[i] = 0;
        }
    }

    var worldRotation_euler = new THREE.Euler;

    function reconnect(join) {
        if (app.mp_connected || isFatalError) return;
        status_node.innerHTML += "<br/>";
        status_node.innerHTML += "re-connecting...";
        lobby_message_node.innerHTML = "re-connecting...";

        if (reconnection_timeout) clearTimeout(reconnection_timeout);
        let delay = 3000 + Math.random() * 1000; // randomize to avoid heavy load
        reconnection_timeout = setTimeout(() => {
            status_node.innerHTML = '';
            clearTimeout(latency_timer);
            app.connect(join);
            reconnect_counter++;
            console.log("re-connecting to", app.gameID);
        }, delay)
    }

    var time_message;

    function send_time(response) {
        if (!app.mp_connected) return;
        latency_clock = Date.now();
        time_message = JSON.stringify({
            "do": "t",
            "r": response,
            "t": latency_clock,
            "s": app.lobby_slice
        })
        app.ws.send(time_message);
        app.badwidth_out += app.getUTF8Size(time_message);
    }

    var position;
    var rotation;
    var trn;
    var update_message;

    app.send_mp_update = () => {
        if (!player_visible || !app.mp_joined || player_list.length < 2) return;

        if (app.playerObject.worldPosition) {
            position = [
                app.playerObject.worldPosition.x.toFixed(1), // pos x
                app.playerObject.worldPosition.y.toFixed(1), // pos y
                app.playerObject.worldPosition.z.toFixed(1), // pos z
                app.playerObject.verticalMovement.toFixed(1), // current vertical movement
                app.playerObject.targetVerticalMovement.toFixed(1) // target vertical movement
            ];
            rotation = [
                app.playerObject.player.rotation.y.toFixed(2), // current world rotation y
                app.playerObject.targetRotationY.toFixed(2), // target world rotation y
                app.playerObject.asset.ship.rotation.x.toFixed(2) // local rotation x 
            ];
            trn = [app.playerObject.turningInput.x.toFixed(1), app.playerObject.turningInput.y.toFixed(1)];
            update_message = JSON.stringify({
                "do": "pu",
                "t": Date.now(),
                "p": position,
                "r": rotation,
                "s": [app.playerObject.speed.toFixed(1), app.playerObject.targetSpeed.toFixed(1)],
                "d": trn
            })
            app.ws.send(update_message);
            app.badwidth_out += app.getUTF8Size(update_message);

            display_bandwidth();
        }
    }

    var shot_position;
    var shot_rotation;
    var shot_message;

    app.send_shot = (i, power, pos, rot, speed) => {
        if (!player_visible || !app.mp_joined || player_list.length < 2) return;
        shot_position = [
            pos.x.toFixed(1),
            pos.y.toFixed(1),
            pos.z.toFixed(1)
        ];
        worldRotation_euler.setFromQuaternion(rot);
        shot_rotation = [
            worldRotation_euler.x.toFixed(2),
            worldRotation_euler.y.toFixed(2),
            worldRotation_euler.z.toFixed(2)
        ];
        shot_message = JSON.stringify({
            "do": "rs",
            "i": i,
            "f": power,
            "p": shot_position,
            "r": shot_rotation,
            "s": speed
        })
        app.ws.send(shot_message);
        app.badwidth_out += app.getUTF8Size(shot_message);
    }

    function palyerID_to_index(pID) {
        for (let i = 0; i < player_list.length; i++) {
            if (pID == player_list[i].ppID) {
                return i;
            }
        }
    }

    function update_onlinePlayers() {
        app.mp_player_pool.forEach(player => {
            if (player.index == null) return;

            let i = player.index;
            if (player_activeStates[i] == 1) {
                player.active = player.object.visible = true;
                player_list_nodes[i].className = '';
            } else {
                player.active = player.object.visible = false;
                player_list_nodes[i].className = 'inactive';
            }
            player.score = player_scores[i];

            if (player.active) {
                if (player_positions[i]) {
                    // check distance between local animation and playerUpdate
                    // console.log("distance to pu pos", player.object.position.distanceTo(new THREE.Vector3(parseFloat(player_positions[i][0]), parseFloat(player_positions[i][1]), parseFloat(player_positions[i][2]))));

                    player.object.position.set(parseFloat(player_positions[i][0]), parseFloat(player_positions[i][1]), parseFloat(player_positions[i][2]));
                    verticalMovement_velocity[i] = parseFloat(player_positions[i][3]);
                    verticalMovement[i] = parseFloat(player_positions[i][4]);

                    player.object.rotation.y = player_rotationY_velocity[i] = parseFloat(player_rotations[i][0]);
                    player_targetRotationY[i] = parseFloat(player_rotations[i][1]);
                    player.ship.object.rotation.x = local_rotationX_velocity[i] = parseFloat(player_rotations[i][2]);

                    player.speed = parseFloat(player_speeds[i][0]);
                    player_targetSpeed[i] = parseFloat(player_speeds[i][1]);
                    player.trn = [parseFloat(player_trns[i][0]), parseFloat(player_trns[i][1])];

                    // radar
                    player.radarPosition.set(player.object.position.x, player.object.position.z);
                    player.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
                    player.radarPosition.sub(app.playerObject.worldPosition2D);

                    // extrapolate
                    move_player(player, average_latency * 0.001);
                }
            }
        })
    }

    function update_onlineRockets() {
        if (rocket_positions.length == 0) return;

        player_list.forEach((player, i) => {
            if (player.ppID == publicPlayerID) { // this client
                if (rocket_positions[i]) rocket_positions[i].forEach(rocket => {
                    app.playerRocket_pool[rocket.i].asset.position.set(parseFloat(rocket.pos[0]), parseFloat(rocket.pos[1]), parseFloat(rocket.pos[2]));
                    // push forward to current time
                    app.playerRocket_pool[rocket.i].asset.translateZ((app.playerRocket_speed + app.playerRocket_pool[rocket.i].speed) * average_latency * 0.001);
                })
            } else { // mp clients
                if (rocket_positions[i]) rocket_positions[i].forEach(rocket => {
                    // app.mp_rocket_pool[rocket.i].asset.position.set(parseFloat(rocket.pos[0]), parseFloat(rocket.pos[1]), parseFloat(rocket.pos[2]));
                })
            }
        })
    }

    app.reset_onlinePlayers = function () {
        app.mp_player_pool.forEach(player => {
            if (!player.isFree) remove_onlinePlayer(player);
        })
    }

    app.assign_onlinePlayers = function () {
        // remove player that left
        app.mp_player_pool.forEach(player => {
            if (player.ppID == publicPlayerID) return;
            for (let j = 0; j < player_list.length; j++) {
                if (player.ppID == player_list[j].ppID) {
                    return;
                }
            }
            // console.log('removing', player.ppID);
            if (player.ppID && !player.isFree) remove_onlinePlayer(player);
        })

        // assign new index if player exists
        player_list.forEach((player, i) => {
            if (player.ppID == publicPlayerID) return;
            for (let j = 0; j < app.mp_player_pool.length; j++) {
                if (player.ppID == app.mp_player_pool[j].ppID) {
                    app.mp_player_pool[j].index = i;
                    // console.log('assigning', player.ppID);
                    return;
                }
            }
            // not found, activate new player
            // console.log('adding', player.ppID);
            activate_onlinePlayer(i, player);
        })
    }

    function remove_onlinePlayer(player) {
        // return to pool
        player.index = null;
        player.ppID = null;
        player.playerName = '';
        player.score = 0;
        player.isFree = true;
        player.active = false;
        player.isConnected = false;
        player.object.visible = false;
        player.object.position.copy(app.instance_parkingPosition);
    }

    function spawn_onlinePlayer(index) {
        var object = new THREE.Group();
        let ship = app.get_onlinePlayer(index);
        object.add(ship.object);
        let radarPosition = new THREE.Vector2(9999, 0);

        let mp_player = {
            active: false,
            index: null,
            ppID: null,
            playerName: '',
            score: 0,
            isFree: true,
            isConnected: false,
            object: object,
            ship: ship,
            distance: 0,
            health: tuna_health,
            speed: 0,
            trn: [0, 0],
            radarPosition: radarPosition
        };
        Object.seal(mp_player);
        return mp_player;
    }

    function activate_onlinePlayer(index, p) {
        // get a pool player
        for (let i = 0; i < app.mp_player_pool.length; i++) {
            if (app.mp_player_pool[i].isFree) {
                let player = app.mp_player_pool[i];
                player.index = index;
                player.ppID = p.ppID;
                player.playerName = p.nick;
                player.score = player_scores[index];
                player.active = false;
                player.isFree = false;
                player.isConnected = true;
                player.health = tuna_health;
                player.speed = 0;
                app.mp_player_group.add(player.object);
                player.ship.material.uniforms.decal_channels.value = app.decalChannels.all;
                player.object.position.copy(app.instance_parkingPosition);
                player.radarPosition.set(9999, 0);
                player.object.visible = true;
                player.object.rotation.set(0, 0, 0);
                player.ship.object.rotation.set(0, 0, 0);

                return; // stop loop when player found
            }
        }
    }

    var rotation_vector_clamp_upper = new THREE.Vector3(0.5, 0.5);
    var rotation_vector_clamp_lower = new THREE.Vector3(-0.5, -0.5);

    app.animate_onlinePlayers = () => {
        app.mp_player_pool.forEach(player => {
            if (!player.isFree && player.active) {
                player.ship.rotor.rotation.z -= app.deltaTime * player.speed * 0.5;
                move_player(player, app.deltaTime);
            }
        })
    }

    function move_player(player, deltaTime) {
        let i = player.index;

        // speed
        player.speed = THREE.Math.lerp(player.speed, player_targetSpeed[i], deltaTime * 0.5);

        // move player
        player.object.translateZ(player.speed * deltaTime);
        // console.log(player.object.position)

        // rotate player
        if (player.trn[0] != 0) {
            player_targetRotationY[i] -= player.trn[0] * deltaTime;
        }
        player_rotationY_velocity[i] = THREE.Math.lerp(player_rotationY_velocity[i], player_targetRotationY[i], deltaTime * 0.5);
        player.object.rotation.y = player_rotationY_velocity[i];

        if (player.trn[1] != 0) {
            verticalMovement[i] = (player.trn[1] > 0) ? 1.0 : -0.7;
            local_rotationX[i] += player.trn[1] * deltaTime * 3;
        } else {
            verticalMovement[i] = 0;
            local_rotationX[i] -= local_rotationX[i] * deltaTime * 3;
        }

        local_rotationX[i] = Math.min(Math.max(local_rotationX[i], -0.5), 0.5);
        local_rotationX_velocity[i] = THREE.Math.lerp(local_rotationX_velocity[i], local_rotationX[i], deltaTime * 0.5);
        player.ship.object.rotation.x = local_rotationX_velocity[i];

        verticalMovement_velocity[i] = THREE.Math.lerp(verticalMovement_velocity[i], verticalMovement[i], deltaTime * 0.5);
        player.object.position.y -= verticalMovement_velocity[i] * player.speed * deltaTime;
    }

    var reset_available = true;
    var reset_timeout;
    var reset_position = [0, 0, 0];

    function handleKeyUp(e) {
        if (app.inMenu || !app.multiplayerMode) return;
        switch (e.key) {
            case '*':
            case 'r':
                if (!reset_available || (app.playerObject.health > 0 && app.playerObject.health < tuna_health)) return;
                reset_available = false;
                instruct_node.innerText = '';
                clearTimeout(reset_timeout);
                reset_timeout = setTimeout(() => {
                    reset_available = true;
                }, 10000)

                app.reset_player();
                if (app.ws) {
                    reset_position = [
                        app.playerObject.worldPosition.x.toFixed(1), // pos x
                        app.playerObject.worldPosition.y.toFixed(1), // pos y
                        app.playerObject.worldPosition.z.toFixed(1), // pos z
                    ];
                    app.ws.send(JSON.stringify({ "do": "reset", "p": reset_position }));
                }
                app.send_mp_update();
                break;
        }
    }

    app.getUTF8Size = (str) => {
        var sizeInBytes = str.split('')
            .map(function (ch) {
                return ch.charCodeAt(0);
            }).map(function (uchar) {
                return uchar < 128 ? 1 : 2;
            }).reduce(function (curr, next) {
                return curr + next;
            });
        return sizeInBytes;
    };

    var bw_label;
    var bw_in;
    var bw_out;

    function display_bandwidth() {
        bw_in = app.badwidth_in / 1024;
        if (bw_in < 900) {
            bw_in = Math.ceil(bw_in) + "KB";
        } else {
            bw_in = (bw_in / 1024).toFixed(2) + "MB";
        }

        bw_out = app.badwidth_out / 1024;
        if (bw_out < 900) {
            bw_out = Math.ceil(bw_out) + "KB";
        } else {
            bw_out = (bw_out / 1024).toFixed(2) + "MB";
        }

        bw_label = "net traffic [in: " + bw_in + " | out: " + bw_out + "]";
        bandwidth_node.innerHTML = bw_label;
    }

    function array_to_vector3(array) {
        return new THREE.Vector3(parseFloat(array[0]), parseFloat(array[1]), parseFloat(array[2]));
    }

    function vector3_to_array(vector3) {
        // prepare for sending
        return [Math.round(vector3.x * 10) * 0.1, Math.round(vector3.y * 10) * 0.1, Math.round(vector3.z * 10) * 0.1];
    }

    return app;
}(MODULE));
