(function (app) {

    var lobby_playerName_node = document.getElementById("lobby_playerName");
    var lobby_list_node = document.getElementById("lobby_list_body");
    var lobby_playerCount_node = document.getElementById("lobby_playerCount");
    var lobby_server_node = document.getElementById("lobby_server");
    var lobby_stage_node = document.getElementById("lobby_stage");

    app.lobby_slice = 0;

    app.get_gameStats = (id) => {
        if (id == '') return;
        let game_request = JSON.stringify({
            "do": "gameID",
            "id": id
        });
        app.ws.send(game_request);
        app.badwidth_out += app.getUTF8Size(game_request);
    }

    var lobby_list_rows = [];

    var button_row = document.createElement("tr");
    button_row.id = "lobby_list_buttons";
    var col_prev = document.createElement("td");
    var col_next = document.createElement("td");

    app.set_lobbyPage = (forward) => {
        lobby_list_rows.forEach(row => {
            row.classList.remove('selected');
        })

        stats_row.style.display = 'none';
        stats_row.className = '';
        if (forward) {
            if (app.lobby_slice < 19) app.lobby_slice++;
        } else {
            if (app.lobby_slice > 0) app.lobby_slice--;
        }

        // paging
        if (app.lobby_slice == 0) {
            col_prev.className = "disabled";
            col_prev.tabIndex = 0;
            col_next.className = "navItem";
            col_next.tabIndex = 60;
            app.focusActiveButton(col_next);
        } else if (app.lobby_slice == 19) {
            col_prev.className = "navItem";
            col_prev.tabIndex = 60;
            col_next.className = "disabled";
            col_next.tabIndex = 0;
            app.focusActiveButton(col_prev);
        } else {
            col_prev.className = "navItem";
            col_prev.tabIndex = 60;
            col_next.className = "navItem";
            col_next.tabIndex = 61;
            if (forward) app.focusActiveButton(col_next);
        }
    }

    app.populateList = () => {
        app.lobby_slice = 0;
        let header =
            `<tr>
            <th>ID</th>
            <th>P#</th>
            <th>Mode</th>
            <th>LVL</th>
            </tr>`;
        lobby_list_node.innerHTML = header;

        for (let i = 1; i < 6; i++) {
            let row = document.createElement("tr");
            row.className = "navItem";
            row.tabIndex = i * 10;
            let col_gid = document.createElement("td");
            col_gid.width = "15%";
            col_gid.innerText = "-";
            let col_pc = document.createElement("td");
            col_pc.width = "15%";
            let col_mode = document.createElement("td");
            col_mode.width = "20%";
            col_mode.innerText = "DM";
            let col_lvl = document.createElement("td");
            col_lvl.innerText = "-";

            row.appendChild(col_gid);
            row.appendChild(col_pc);
            row.appendChild(col_mode);
            row.appendChild(col_lvl);
            lobby_list_node.appendChild(row);
            lobby_list_rows[i - 1] = row;
        }

        // navigation
        col_prev.className = "disabled";
        col_prev.tabIndex = 0;
        col_prev.colSpan = 3;
        col_prev.innerText = "< prev";
        col_prev.setAttribute("data-function", "llPrev");

        col_next.className = "navItem";
        col_next.tabIndex = 60;
        col_next.innerText = "next >";
        col_next.setAttribute("data-function", "llNext");

        button_row.appendChild(col_prev);
        button_row.appendChild(col_next);
        lobby_list_node.appendChild(button_row)
    }

    var lobby_list_row0;
    var lobby_list_row1;
    var lobby_list_row2;
    var lobby_list_row3;
    var lobby_list_row4;

    app.updateList = (totalPlayerCount, playerCounts, levels) => {
        lobby_playerCount_node.innerText = "players online:" + totalPlayerCount;

        lobby_list_row0 = lobby_list_rows[0].childNodes;
        lobby_list_row1 = lobby_list_rows[1].childNodes;
        lobby_list_row2 = lobby_list_rows[2].childNodes;
        lobby_list_row3 = lobby_list_rows[3].childNodes;
        lobby_list_row4 = lobby_list_rows[4].childNodes;

        let start_level = app.lobby_slice * 5;

        lobby_list_rows[0].setAttribute("data-getID", (start_level + 1));
        lobby_list_row0[0].innerText = start_level + 1;
        lobby_list_row0[1].innerText = playerCounts[0];
        lobby_list_row0[3].innerText = get_levelName(levels[0]);

        lobby_list_rows[1].setAttribute("data-getID", (start_level + 2));
        lobby_list_row1[0].innerText = start_level + 2;
        lobby_list_row1[1].innerText = playerCounts[1];
        lobby_list_row1[3].innerText = get_levelName(levels[1]);

        lobby_list_rows[2].setAttribute("data-getID", (start_level + 3));
        lobby_list_row2[0].innerText = start_level + 3;
        lobby_list_row2[1].innerText = playerCounts[2];
        lobby_list_row2[3].innerText = get_levelName(levels[2]);

        lobby_list_rows[3].setAttribute("data-getID", (start_level + 4));
        lobby_list_row3[0].innerText = start_level + 4;
        lobby_list_row3[1].innerText = playerCounts[3];
        lobby_list_row3[3].innerText = get_levelName(levels[3]);

        lobby_list_rows[4].setAttribute("data-getID", (start_level + 5));
        lobby_list_row4[0].innerText = start_level + 5;
        lobby_list_row4[1].innerText = playerCounts[4];
        lobby_list_row4[3].innerText = get_levelName(levels[4]);
    }

    let stats_row = document.createElement("tr");
    stats_row.id = 'gameStats';
    let stats_col = document.createElement("td");
    stats_col.colSpan = 4;
    stats_row.appendChild(stats_col);

    let lobby_players_node = document.createElement('div');
    lobby_players_node.id = "player_list";

    let lobby_refresh_button = document.createElement('div');
    lobby_refresh_button.id = "refresh_button";
    lobby_refresh_button.innerText = 'refresh';

    let lobby_join_button = document.createElement('div');
    lobby_join_button.id = "join_button";
    lobby_join_button.innerText = '→ join';

    app.display_gameStats = (players, scores) => {
        // reset selection
        lobby_list_rows.forEach(row => {
            row.classList.remove('selected');
        })
        // console.log(players)
        // list players
        if (players != null) {
            let row_index = app.gameID - app.lobby_slice * 5 - 1
            if (!lobby_list_rows[row_index]) return;
            lobby_list_rows[row_index].classList.add('selected');
            let next_node = lobby_list_rows[row_index + 1];
            (next_node) ? lobby_list_node.insertBefore(stats_row, next_node) : lobby_list_node.insertBefore(stats_row, button_row);

            stats_row.style.display = 'table-row';
            stats_row.className = 'navItem';
            stats_row.tabIndex = parseInt(lobby_list_rows[row_index].tabIndex) + 1;
            stats_row.setAttribute("data-joinID", app.gameID);

            lobby_players_node.innerHTML = '';
            if (players.length > 0) {
                players.forEach((player, i) => {
                    let stats_p = document.createElement('div');
                    stats_p.className = 'player';
                    let stats_p_badges = document.createElement('div');
                    stats_p_badges.className = 'badge';
                    stats_p.appendChild(stats_p_badges);
                    let isLeader = 0;
                    if (app.mp_leader_ppID == player.ppID) isLeader = 1;
                    app.showBadges(stats_p_badges, scores[i], 'gameStats', isLeader);

                    let stats_p_name = document.createElement('div');
                    stats_p_name.className = 'name';
                    stats_p.appendChild(stats_p_name);
                    stats_p_name.innerHTML = (player.nick != '') ? player.nick : '#' + player.ppID;
                    lobby_players_node.appendChild(stats_p);
                })
                stats_col.appendChild(lobby_players_node);
            }
            stats_col.appendChild(lobby_refresh_button);
            stats_col.appendChild(lobby_join_button);
        }
    }

    function get_levelName(index) {
        switch (index) {
            case -1:
                return "[yours]";
            case 0:
                return app.stage_grasslands.title;
            case 1:
                return app.stage_lava.title;
            case 2:
                return app.stage_desert.title;
        }
    }

    app.release_join = () => {
        if (app.ws && app.mp_connected) {
            lobby_join_button.classList.remove('locked');
            app.mp_join_released = true;
        } else {
            prevent_join();
        }
    }

    app.prevent_join = () => {
        lobby_join_button.classList.add('locked');
        app.mp_join_released = false;
    }

    app.mp_updateSelection = () => {
        app.mp_stage = app.level_mp_deathmatch.stageIndex = parseInt(lobby_stage_node.value);
        app.setServer(parseInt(lobby_server_node.value));
    }

    function check_free_name() {
        if (app.playerName == '') return;
        let name_request = JSON.stringify({
            "do": "nick",
            "p": app.playerID,
            "n": app.playerName
        });
        app.ws.send(name_request);
        app.badwidth_out += app.getUTF8Size(name_request);
    }

    app.mp_enter_name = () => {
        app.promptActive = true;
        promptMessage = "Enter name (3 - 10 characters)";
        let name = prompt(promptMessage, "");
        clearTimeout(app.connection_lost_timout);
        if (name != null) {
            if (name.length == 0) {
                app.playerName = '';
                lobby_playerName_node.innerText = '';
                app.release_join();
            } else if (name.length < 3) {
                alert('Name is too short!');
            } else if (name.length > 10) {
                alert('Name is too long!');
            }
            app.playerName = String(name);
            app.format_playerName();
            check_free_name();
            lobby_playerName_node.innerText = app.playerName;

            app.file_read(true);
        }
        app.postPromptDelay();
    }

    var badge_img = '';
    var badge_title = '';

    app.showBadges = (parent, score, location, isLeader) => {
        // console.log('showBadges', score, isLeader);
        parent.innerHTML = '';

        if (location == 'profile') {
            if (score >= 5000) {
                badge_img = "./ui/badges/profile/badge_rank_4.png";
                badge_title = "Score 5000+";
            } else if (score >= 1000) {
                badge_img = "./ui/badges/profile/badge_rank_3.png";
                badge_title = "Score 1000+";
            } else if (score >= 500) {
                badge_img = "./ui/badges/profile/badge_rank_2.png";
                badge_title = "Score 500+";
            } else if (score >= 100) {
                badge_img = "./ui/badges/profile/badge_rank_1.png";
                badge_title = "Score 100+";
            }
            // create nodes
            if (score >= 100) {
                parent.innerHTML =
                    `<div class="lobby_badge">
                        <img src="` + badge_img + `" alt="` + badge_title + `" /><br />
                        <span>` + badge_title + `</span>
                    </div>`;
            }

            if (isLeader == 1) {
                badge_img = "./ui/badges/profile/badge_leader.png";
                badge_title = "Highest Score";
                parent.innerHTML +=
                    `<div class="lobby_badge">
                        <img src="` + badge_img + `" alt="` + badge_title + `" /><br />
                        <span>` + badge_title + `</span>
                    </div>`;
            }
        } else if (location == 'gameStats') {
            if (isLeader == 1) {
                badge_img = "./ui/badges/lobby/badge_leader.png";
                parent.innerHTML =
                    `<img src="` + badge_img + `" />`;
            } else {
                if (score >= 5000) {
                    badge_img = "./ui/badges/lobby/badge_rank_4.png";
                } else if (score >= 1000) {
                    badge_img = "./ui/badges/lobby/badge_rank_3.png";
                } else if (score >= 500) {
                    badge_img = "./ui/badges/lobby/badge_rank_2.png";
                } else if (score >= 100) {
                    badge_img = "./ui/badges/lobby/badge_rank_1.png";
                }
                // create nodes
                if (score >= 100) {
                    parent.innerHTML = `<img src="` + badge_img + `" />`;
                }
            }
        } else if (location == 'hud') {
            if (isLeader == 1) {
                badge_img = "./ui/badges/lobby/badge_leader.png";
                parent.innerHTML = `<img src="` + badge_img + `" />`;
            }
        }
    }

    return app;
}(MODULE));
