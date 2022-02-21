(function (app) {

    var hud;
    var hud_health_bar;
    var hud_heat;
    var hud_heat_bar;
    var hud_charge;
    var hud_charge_bar;
    var hud_altitude;
    var hud_speed;
    var hud_radar;
    var hud_radar_flash;
    var objectives;
    var hud_compass;
    var hud_compass_scale;
    var hud_compass_pointers;
    var hud_compass_distance;
    var hud_throttle;
    var hud_throttle_children;
    var softkeyBar;
    var benchmarkHUD;
    var benchmark_fps;
    var benchmark_time;
    var bench_aa;
    var bench_shadow;
    var bench_soundfx;
    var hud_score;
    var hud_score_container;
    var scoreSprites;
    var scoreSprite_interval;
    var scoreSprite;
    var mp_playerNames_node;
    var mp_playerNames_positions = [];

    document.addEventListener("DOMContentLoaded", function () {
        hud = document.getElementById('HUD');
        hud_health_bar = document.getElementById('health_bar');
        hud_heat = document.getElementById('heat');
        hud_heat_bar = document.getElementById('heat_bar');
        hud_charge = document.getElementById('charge');
        hud_charge_bar = document.getElementById('charge_bar');
        hud_altitude = document.getElementById('altitude_value');
        hud_speed = document.getElementById('speed_value');
        hud_radar = document.getElementById('radar');
        hud_radar_flash = document.getElementById('radar_flash');
        objectives = document.getElementById('objectives');
        hud_compass = document.getElementById('compass');
        hud_compass_scale = document.getElementById('scale');
        hud_compass_pointers = document.getElementById('pointers');
        hud_compass_distance = document.getElementById('destination_distance');
        hud_throttle = document.getElementById('throttle');
        hud_throttle_children = hud_throttle.getElementsByTagName('IMG');
        softkeyBar = document.getElementById('softkeyBar');
        benchmarkHUD = document.getElementById('benchmarkHUD');
        multiplayerHUD = document.getElementById('multiplayerHUD');
        benchmark_version = document.getElementById('benchmark_version');
        benchmark_fps = document.getElementById('bench_fps_value');
        benchmark_time = document.getElementById('bench_time_value');
        bench_aa = document.getElementById('bench_aa_value');
        bench_shadow = document.getElementById('bench_shadow_value');
        bench_soundfx = document.getElementById('bench_soundfx_value');

        hud_score = document.getElementById('score');
        hud_score_container = document.getElementById('score_container');
        scoreSprites = document.getElementById('scoreSprites');
        scoreSprite = document.createElement("div");
        scoreSprite.className = 'score';
        scoreSprites.appendChild(scoreSprite);

        mp_playerNames_node = document.getElementById("mp_playerNames");
    });

    var destinationDot;
    var compass_destinationDot;
    var turretDots = [];
    var fighterDots = [];
    var mp_dots = [];
    var mp_playerNames = [];

    app.init_hud = function () {
        // destination
        if (destinationDot != null) {
            destinationDot.remove();
        }
        if (app.level.mission == app.missionTypes.fortress) {
            destinationDot = document.createElement("div");
            destinationDot.className = 'fortress';
            switch (app.level.stageIndex) {
                case app.stages.grasslands:
                    destinationDot.classList.add('skyland');
                    break;
                case app.stages.lava:
                    destinationDot.classList.add('tank');
                    break;
            }
            destinationDot.style.left = 0;
            destinationDot.style.top = 0;
            hud_radar.appendChild(destinationDot);
            destinationDot.style.display = 'none';
        } else if (app.level.mission == app.missionTypes.boss) {
            destinationDot = document.createElement("div");
            destinationDot.className = 'boss';
            destinationDot.style.left = 0;
            destinationDot.style.top = 0;
            hud_radar.appendChild(destinationDot);
            destinationDot.style.display = 'none';
        } else if (app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) {
            destinationDot = document.createElement("div");
            destinationDot.className = 'destination';
            destinationDot.style.left = 0;
            destinationDot.style.top = 0;
            hud_radar.appendChild(destinationDot);
            destinationDot.style.display = 'none';
        }
        // compass
        if (compass_destinationDot != null) {
            compass_destinationDot.remove();
        }
        if (app.level.mission == app.missionTypes.fortress || app.level.mission == app.missionTypes.boss || app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) {
            compass_destination_opacity = 1.0;
            compass_destinationDot = document.createElement("div");
            compass_destinationDot.className = 'destination';
            hud_compass_pointers.appendChild(compass_destinationDot);
            hud_compass_distance.style.display = 'block';
        } else {
            hud_compass_distance.style.display = 'none';
        }

        // turrets
        if (turretDots.length > 0) {
            for (let i = 0; i < turretDots.length; i++) {
                turretDots[i].remove();
            }
            turretDots = [];
        }
        if (app.level.turrets) {
            for (let i = 0; i < app.turret_pool_size; i++) {
                let dot = document.createElement("div");
                dot.className = 'turret';
                dot.style.left = 0;
                dot.style.top = 0;
                hud_radar.appendChild(dot);
                dot.style.display = 'none';
                turretDots.push(dot);
            }
        }

        // fighter
        if (fighterDots.length > 0) {
            for (let i = 0; i < fighterDots.length; i++) {
                fighterDots[i].remove();
            }
            fighterDots = [];
        }
        if (app.level.fighters) {
            for (let i = 0; i < app.fighter_pool_size; i++) {
                let dot = document.createElement("div");
                dot.className = 'fighter';
                dot.style.left = 0;
                dot.style.top = 0;
                hud_radar.appendChild(dot);
                dot.style.display = 'none';
                fighterDots.push(dot);
            }
        }


        // online players
        if (mp_dots.length > 0) {
            for (let i = 0; i < mp_dots.length; i++) {
                mp_dots[i].remove();
                mp_playerNames[i].remove();
            }
            mp_dots = [];
            mp_playerNames = [];
        }
        if (app.multiplayerMode) {
            for (let i = 0; i < app.mp_playerLimit; i++) {
                let dot = document.createElement("div");
                dot.className = 'online';
                dot.style.left = 0;
                dot.style.top = 0;
                hud_radar.appendChild(dot);
                dot.style.display = 'none';
                mp_dots.push(dot);

                let name = document.createElement("div");
                name.className = 'mpName';
                name.style.left = 0;
                name.style.top = 0;
                mp_playerNames_node.appendChild(name);
                mp_playerNames.push(name);
            }
        }

        // radar
        if (app.multiplayerMode) {
            range = 1.0 / app.radar_spawn_distance_mp * 100;
        } else {
            range = 1.0 / app.radar_spawn_distance * 100;
        }
        rangeVector = new THREE.Vector2(-range, -range);
    }


    var range;
    var rangeVector;
    var radarPos = new THREE.Vector2();

    const compass_range = 1000;
    const compass_range_half = 500;
    const compass_center_offset = 110;
    var compass_position = 0;
    var compass_destination_position = 0;
    var compass_destination_opacity = 1.0;

    var altitude = 0;
    var speed = 0;

    app.update_hud = function () {
        if (!app.gameRunning) {
            hud.style.display = 'none';
            return;
        } else if (app.inMenu) {
            softkeyBar.style.display = 'block';
            hud.style.display = 'block';
            hud_radar.style.display = 'none';
            objectives.style.display = 'none';
            hud_compass.style.display = 'none';
            hud_heat.style.display = 'none';
            hud_charge.style.display = 'none';
            hud_score.style.display = 'none';
            benchmarkHUD.style.display = 'none';
            multiplayerHUD.style.display = 'none';
            return;
        }
        softkeyBar.style.display = 'none';
        hud.style.display = 'block';
        hud_radar.style.display = 'block';
        hud_compass.style.display = 'block';
        hud_heat.style.display = 'block';
        hud_charge.style.display = 'block';
        hud_score.style.display = 'block';

        if (app.benchmarkMode) {
            objectives.style.display = 'none';
            benchmarkHUD.style.display = 'block';
            multiplayerHUD.style.display = 'none';
        } else if (app.multiplayerMode) {
            objectives.style.display = 'none';
            benchmarkHUD.style.display = 'none';
            multiplayerHUD.style.display = 'block';
        } else {
            objectives.style.display = 'block';
            benchmarkHUD.style.display = 'none';
            multiplayerHUD.style.display = 'none';
        }

        // health
        let player_health = app.playerObject.health;
        player_health /= (app.multiplayerMode) ? 2 : 1;
        hud_health_bar.style.width = player_health + '%';

        // weapon heat
        hud_heat_bar.style.width = app.playerObject.weaponHeat + '%';

        // weapon charge
        hud_charge_bar.style.width = app.playerObject.weaponCharge + '%';

        if (app.frameCount % app.hud_refreshRate == 0) {
            if (app.level.stageIndex == app.stages.space) {
                altitude = "---";
                speed = "---";
            } else {
                altitude = Math.round(app.playerObject.worldPosition.y + 280);
                speed = Math.round(app.playerObject.speed * 3.6);
            }

            // altitude
            hud_altitude.innerHTML = altitude;

            // speed
            // m/s to kmh
            hud_speed.innerHTML = speed;

            // compass
            compass_position = (app.playerObject.player.rotation.y / app.pi2 * compass_range) % compass_range + compass_center_offset;
            if (compass_position > 235) {
                compass_position -= compass_range;
            } else if (compass_position < -765) {
                compass_position += compass_range;
            }
            hud_compass_scale.style.left = compass_position + 'px';

            if (compass_destinationDot != null) {
                compass_destinationDot.style.display = 'block';
                if (app.level.mission == app.missionTypes.fortress) {
                    hud_compass_distance.innerHTML = app.fortress.distance;
                    compass_destination_position = compass_position - (app.fortress.angleToPlayer / app.pi2 * compass_range) % compass_range + compass_range_half;
                } else if (app.level.mission == app.missionTypes.boss) {
                    hud_compass_distance.innerHTML = app.boss.distance;
                    compass_destination_position = compass_position - (app.boss.angleToPlayer / app.pi2 * compass_range) % compass_range + compass_range_half;
                } else if (app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) {
                    hud_compass_distance.innerHTML = app.destination.distance;
                    compass_destination_position = compass_position - (app.destination.angleToPlayer / app.pi2 * compass_range) % compass_range + compass_range_half;
                }
                if (compass_destination_position < 0) {
                    compass_destination_position += compass_range;
                } else if (compass_destination_position > compass_range) {
                    compass_destination_position -= compass_range;
                }
                // limit in screen space
                if (compass_destination_position > 625) {
                    compass_destination_opacity = (compass_destination_position - 625) / 375;
                    compass_destination_position = 0;
                } else if (compass_destination_position > 225) {
                    compass_destination_opacity = (625 - compass_destination_position) / 400;
                    compass_destination_position = 225;
                } else {
                    compass_destination_opacity = 1.0;
                }

                //console.log(compass_destination_position);
                compass_destinationDot.style.opacity = compass_destination_opacity;
                compass_destinationDot.style.left = compass_destination_position + 'px';
                if (compass_destination_position < 200) {
                    hud_compass_distance.style.left = (compass_destination_position + 12) + 'px';
                    hud_compass_distance.style.textAlign = 'left';
                } else {
                    hud_compass_distance.style.left = (compass_destination_position - 40) + 'px';
                    hud_compass_distance.style.textAlign = 'right';
                }
            }
            // radar flash
            hud_radar_flash.style.opacity -= app.deltaTime_double;
        }

        if (app.frameCount % app.radar_refreshRate == 0) {
            // radar
            hud_radar_flash.style.opacity = 0.6;
            if (app.level.mission == app.missionTypes.fortress) {
                radarPos.copy(app.fortress.radarPosition);
                radarPos.multiply(rangeVector);
                destinationDot.style.display = 'block';
                destinationDot.style.left = (50 + radarPos.x) + '%';
                destinationDot.style.top = (50 + radarPos.y) + '%';
            } else if (app.level.mission == app.missionTypes.boss) {
                radarPos.copy(app.boss.radarPosition);
                radarPos.multiply(rangeVector);
                destinationDot.style.display = 'block';
                destinationDot.style.left = (50 + radarPos.x) + '%';
                destinationDot.style.top = (50 + radarPos.y) + '%';
            } else if (app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) {
                radarPos.copy(app.destination.radarPosition);
                radarPos.multiply(rangeVector);
                destinationDot.style.display = 'block';
                destinationDot.style.left = (50 + radarPos.x) + '%';
                destinationDot.style.top = (50 + radarPos.y) + '%';
            }

            if (app.level.turrets && turretDots.length == app.turret_pool_size) {
                for (let i = 0; i < app.turret_pool.length; i++) {
                    if (!app.turret_pool[i].isFree && app.turret_pool[i].distance < app.radar_spawn_distance) {
                        radarPos.copy(app.turret_pool[i].radarPosition);
                        radarPos.multiply(rangeVector);

                        turretDots[i].style.display = 'block';
                        turretDots[i].style.left = (50 + radarPos.x) + '%';
                        turretDots[i].style.top = (50 + radarPos.y) + '%';
                    } else {
                        turretDots[i].style.display = 'none';
                    }
                }
            }

            if (app.level.fighters && fighterDots.length == app.fighter_pool_size) {
                for (let i = 0; i < app.fighter_pool.length; i++) {
                    if (!app.fighter_pool[i].isFree && app.fighter_pool[i].distance < app.radar_spawn_distance) {
                        radarPos.copy(app.fighter_pool[i].radarPosition);
                        radarPos.multiply(rangeVector);

                        fighterDots[i].style.display = 'block';
                        fighterDots[i].style.left = (50 + radarPos.x) + '%';
                        fighterDots[i].style.top = (50 + radarPos.y) + '%';
                    } else {
                        fighterDots[i].style.display = 'none';
                    }
                }
            }


            if (app.multiplayerMode && mp_dots.length == app.mp_playerLimit) {
                for (let i = 0; i < app.mp_player_pool.length; i++) {
                    if (!app.mp_player_pool[i].isFree && app.mp_player_pool[i].active) {
                        radarPos.copy(app.mp_player_pool[i].radarPosition);
                        radarPos.multiply(rangeVector);
                        radarPos.clampLength(-49, 49);

                        mp_dots[i].style.display = 'block';
                        mp_dots[i].style.left = (50 + radarPos.x) + '%';
                        mp_dots[i].style.top = (50 + radarPos.y) + '%';
                    } else {
                        mp_dots[i].style.display = 'none';
                    }
                }
            }
        }

        if (app.multiplayerMode && mp_playerNames.length == app.mp_playerLimit) {
            for (let i = 0; i < app.mp_player_pool.length; i++) {
                if (!app.mp_player_pool[i].isFree && app.mp_player_pool[i].active) {
                    mp_playerNames[i].innerHTML = (app.mp_player_pool[i].playerName != '') ? app.mp_player_pool[i].playerName : app.mp_player_pool[i].ppID;
                    mp_playerNames[i].innerHTML += " | " + app.mp_player_pool[i].score;
                    mp_playerNames_positions[i] = app.mp_player_pool[i].object.position.clone();

                    let distance = app.mp_player_pool[i].radarPosition.y * 0.0005;
                    distance *= (app.reverseView == 0) ? 1 : -1;
                    let distance_inv = 1 - Math.min(1, distance);
                    // display only when in front of camera
                    if (distance > 0) {
                        mp_playerNames_positions[i].project(app.camera);
                        if (app.landscapeOrientation) {
                            mp_playerNames_positions[i].x = (mp_playerNames_positions[i].x * app.screenWidthHalf) + app.screenWidthHalf + 16;
                            mp_playerNames_positions[i].y = - (mp_playerNames_positions[i].y * app.screenHeightHalf) + app.screenHeightHalf - 62;
                        } else {
                            mp_playerNames_positions[i].x = (mp_playerNames_positions[i].x * app.screenWidthHalf) + app.screenWidthHalf - 24;
                            mp_playerNames_positions[i].y = - (mp_playerNames_positions[i].y * app.screenHeightHalf) + app.screenHeightHalf + 14;
                        }

                        mp_playerNames[i].style.display = 'block';
                        mp_playerNames[i].style.opacity = distance_inv;
                        mp_playerNames[i].style.left = (mp_playerNames_positions[i].x) + 'px';
                        mp_playerNames[i].style.top = (mp_playerNames_positions[i].y) + 'px';
                    } else {
                        mp_playerNames[i].style.display = 'none';
                    }
                } else {
                    mp_playerNames[i].style.display = 'none';
                }
            }
        }

        animate_ticker();

        if (app.benchmarkMode) benchmark();
    }

    app.update_throttle_hud = function () {
        for (let i = 0; i < hud_throttle_children.length; i++) {
            hud_throttle_children[i].style.display = 'none';
        }
        let throttle_index = Math.max(0, Math.round(app.playerSelectedSpeed * 10 - 3));
        hud_throttle_children[throttle_index].style.display = 'block';
    }

    var ticker = document.getElementById("ticker");
    ticker.style.display = "none";
    var ticker_position = 0;
    var ticker_text = '';
    var ticker_timeout;

    app.set_ticker = function (text) {
        clearTimeout(ticker_timeout);
        ticker.style.display = "block";
        ticker.innerHTML = '';
        ticker_text = text;
        ticker_position = 0;
    }

    var minDuration = 4000;
    var charMultiplier = 100;

    function animate_ticker() {
        if (ticker_position < ticker_text.length) {
            ticker.innerHTML += ticker_text.charAt(ticker_position);
            ticker_position++;

            let duration = Math.max(ticker_text.length * charMultiplier, minDuration);
            if (ticker_position == ticker_text.length - 1) {
                ticker_timeout = setTimeout(function () { ticker.style.display = "none"; }, duration);
            }
        }
    }

    var scoreSprite_fade_timer;
    var scoreSprite_position = new THREE.Vector2(0, 0);
    var scoreSprite_targetPosition;
    var scorePosition;

    app.spawn_scoreSprite = function (score, position) {
        scoreSprite.innerHTML = score;

        scorePosition = position.clone();
        scorePosition.project(app.camera);
        if (app.landscapeOrientation) {
            scoreSprite_targetPosition = new THREE.Vector2(280, 200);
            scorePosition.x = (scorePosition.x * app.screenWidthHalf) + app.screenWidthHalf - 10;
            scorePosition.y = - (scorePosition.y * app.screenHeightHalf) + app.screenHeightHalf - 70;
        } else {
            scoreSprite_targetPosition = new THREE.Vector2(200, 280);
            scorePosition.x = (scorePosition.x * app.screenWidthHalf) + app.screenWidthHalf - 50;
            scorePosition.y = - (scorePosition.y * app.screenHeightHalf) + app.screenHeightHalf;

        }
        scoreSprite_position.set(scorePosition.x, scorePosition.y);
        scoreSprite.style.left = (scoreSprite_position.x) + 'px';
        scoreSprite.style.top = (scoreSprite_position.y) + 'px';
        scoreSprite.style.display = 'block';
        scoreSprite.style.transform = "scale(" + 1 + ")";
        scoreSprite.style.opacity = 1;

        scoreSprite_fade_timer = 0;
        clearInterval(scoreSprite_interval);
        scoreSprite_interval = setInterval(fade_sprite, 50);
    }

    function fade_sprite() {
        scoreSprite_fade_timer += 0.05;
        scoreSprite.style.opacity = 1 - scoreSprite_fade_timer;
        scoreSprite_position.lerp(scoreSprite_targetPosition, scoreSprite_fade_timer * scoreSprite_fade_timer);

        scoreSprite.style.left = (scoreSprite_position.x) + 'px';
        scoreSprite.style.top = (scoreSprite_position.y) + 'px';
        scoreSprite.style.transform = "scale(" + (1 - scoreSprite_fade_timer) + ")";
        if (scoreSprite_fade_timer >= 0.98) {
            scoreSprite.classList.remove('fading');
            clearInterval(scoreSprite_interval);
            scoreSprite.style.display = 'none';
            app.refresh_score_hud();
        } else if (scoreSprite_fade_timer >= 0.2) {
            scoreSprite.classList.add('fading');
        }
    }

    var score_hud_timeout;
    var score_kill_timeout;

    app.refresh_score_hud = function () {
        // flashy update
        hud_score.className = '';
        hud_score_container.className = 'flashing';
        hud_score_container.innerHTML = app.currentScore;
        if (score_hud_timeout) clearTimeout(score_hud_timeout);
        score_hud_timeout = setTimeout(function () {
            hud_score_container.className = '';
        }, 300);
    }

    app.refresh_mp_score = function (isKill) {
        let count = 0;
        if (score_kill_timeout) clearTimeout(score_kill_timeout);
        if (isKill) {
            hud_score.className = 'kill';
            count = app.playerObject.killScore;
        } else {
            hud_score.className = 'hit';
            count = app.playerObject.hitScore;
            score_kill_timeout = setTimeout(function () {
                hud_score.className = 'kill';
                hud_score_container.innerHTML = app.playerObject.killScore;
            }, 5000);
        }

        // flashy update
        hud_score_container.className = 'flashing';
        hud_score_container.innerHTML = count;
        if (score_hud_timeout) clearTimeout(score_hud_timeout);
        score_hud_timeout = setTimeout(function () {
            hud_score_container.className = '';
        }, 300);
    }

    app.reset_currentScore = function () {
        app.currentScore = 0;
        hud_score_container.innerHTML = app.currentScore;
    }

    var benchmarkTime = -5;
    var benchmarkFrameCount = 0;

    function benchmark() {
        benchmark_version.innerHTML = 'V' + app.versionString;
        if (app.supersampling_on) {
            bench_aa.innerHTML = 'on';
        } else {
            bench_aa.innerHTML = 'off';
        }
        if (app.shadowDecals_on) {
            bench_shadow.innerHTML = 'on';
        } else {
            bench_shadow.innerHTML = 'off';
        }
        if (app.soundfx_on) {
            bench_soundfx.innerHTML = 'on';
        } else {
            bench_soundfx.innerHTML = 'off';
        }

        benchmark_time.innerHTML = benchmarkTime.toFixed(1);
        if (benchmarkTime >= 120) {
            benchmarkHUD.className = 'finished';
            return;
        }

        benchmarkTime += app.deltaTime;

        if (benchmarkTime > 0) {
            benchmarkFrameCount++;
            benchmark_fps.innerHTML = (1.0 / (benchmarkTime / benchmarkFrameCount)).toFixed(1);
        }

        // mock
        if (benchmarkTime < 2) {
            // wait
        } else if (benchmarkTime < 4) {
            app.moveDown = true;
        } else if (benchmarkTime < 15) {
            app.moveDown = false;
        } else if (benchmarkTime < 20) {
            app.moveLeft = true;
        } else if (benchmarkTime < 31) {
            app.moveLeft = false;
        } else if (benchmarkTime < 36) {
            app.moveUp = true;
        } else if (benchmarkTime < 39) {
            app.moveLeft = true;
        } else if (benchmarkTime < 44) {
            app.moveLeft = false;
        } else if (benchmarkTime < 52) {
            app.moveUp = false;
        } else if (benchmarkTime < 95) {
            // wait
        } else if (benchmarkTime < 112) {
            app.moveRight = true;
        } else if (benchmarkTime < 120) {
            app.moveRight = false;
        }
    }

    app.reset_benchmark = function () {
        benchmarkHUD.className = '';
        benchmarkTime = -5;
        benchmarkFrameCount = 0;
    }

    return app;
}(MODULE));