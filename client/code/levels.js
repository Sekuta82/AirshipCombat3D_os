(function (app) {
    var gridColumns = 2;
    var grid_itemWidth = (100 / gridColumns).toFixed(2);

    const objectives_entries_tag = document.getElementById('objectives_entries');
    const objective_count_tag = document.getElementById('objective_count');
    const objective_timer_tag = document.getElementById('objective_timer');
    const controls = document.getElementById('controls');
    const benchmark_controls = document.getElementById('benchmark_controls');


    //objectives.style.display = 'none';
    var objective_count = 0;
    var objectives_completed = 0;

    app.objective_find_complete = false;
    app.objective_turrets_complete = false;
    app.objective_core_complete = false;
    app.objective_survival_complete = false;

    var objective_find_triggered = false;
    var objective_boss_triggered = false;
    var objective_turrets_triggered = false;
    var objective_core_triggered = false;
    var objective_survival_triggered = false;

    var stageCount = app.stageList.length /* list items */
    var progressIndex = 0;

    var objective_timer = 0;
    var assets_loading = false;

    var levelTimer = 0;

    app.load_level = function (level, reset) {
        app.update_throttle_hud();
        app.update_softkeyBar();
        app.require_reset = false;

        // new stage ready -> start game
        if (app.level_ready) {
            app.level_ready = false;
            app.gamePaused = false;
            app.menu_close();
            // reset game timer
            levelTimer = 0;
            return;
        }

        // show controls
        if (app.benchmarkMode) {
            benchmark_controls.style.display = 'block';
            controls.style.display = 'none';
        } else {
            benchmark_controls.style.display = 'none';
            controls.style.display = 'block';
        }

        // load assets if stage changed
        var new_stage = level.stageIndex;
        if (app.previous_stage != new_stage) {
            if (!assets_loading) {
                cleanup_stageAssets();
                app.load_stageAssets(level.stageIndex);
                app.stage = app.stageList[level.stageIndex];
                app.terrainHeight = app.stage.terrainHeight;
                if (app.terrainObject.object) app.terrainObject.object.scale.y = app.terrainHeight;

                assets_loading = true;
            }

            // wait for stage assets to load; check interval
            if (!app.assets_loadingDone) {
                setTimeout(
                    function () {
                        app.load_level(level, reset);
                    }, 500);
                return;
            }

            app.previous_stage = level.stageIndex;
            assets_loading = false;
        }

        app.reset_currentScore();
        app.reset_boost();

        if (!app.multiplayerMode) {
            localStorage.setItem('stageIndex', app.stageIndex);
            localStorage.setItem('levelIndex', app.levelIndex);
        }

        clearInterval(app.chargeInterval);
        app.moveUp = app.moveDown = app.moveLeft = app.moveRight = false;

        if (app.gameRunning) {
            app.previous_level = app.level;
        } else {
            app.previous_level = level;
        }
        app.level = level;
        if (app.soundfx_on) app.load_level_audio();

        // difficulty settings
        switch (app.level.difficulty) {
            case 0:
                app.enemyRocket_power = 10;
                break;
            case 1:
                app.enemyRocket_power = 15;
                break;
            case 2:
                app.enemyRocket_power = 20;
                break;
        }

        if (app.level.turrets) app.init_turrets();
        if (app.level.fighters) app.init_fighters();

        // deactivate objects not required for level but keep for current stage
        if (app.level.mission == app.missionTypes.fortress) {
            app.init_fortress();
        } else if (app.fortress != null) {
            app.deactivate_fortress();
        }

        if (app.level.mission == app.missionTypes.boss) {
            app.init_boss();
        } else if (app.boss != null) {
            app.deactivate_boss();
        }

        if (app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) {
            spawn_destination();
        } else if (app.destination != null) {
            app.deactivate_destination();
        }

        if ((app.level.mission != app.missionTypes.travel
            && app.level.mission != app.missionTypes.fortress)
            || app.benchmarkMode || app.level.stageIndex == app.stages.space) {
            if (app.boostPortal != null) {
                app.deactivate_portal();
            }
        }

        if (app.level.mission == app.missionTypes.race) {
            app.init_asteroids();
        } else if (app.asteroidsObject != null) {
            app.deactivate_asteroids();
        }

        if (!app.gameRunning || reset) {
            // if (app.debuggenzeit) console.log('start level');
            app.gameRunning = true;

            if (briefingTimeouts.length > 0) {
                for (let i = 0; i < briefingTimeouts.length; i++) {
                    clearTimeout(briefingTimeouts[i]);
                }
            }
            missionBriefing();

            app.raycastTargets = []; // reset raycast targets
            app.reset_player();
            app.remove_enemyRocket();
            app.remove_playerRocket();
            if (app.level.turrets || app.previous_level.turrets) app.reset_turrets();
            if (app.level.fighters || app.previous_level.fighters) app.reset_fighters();
            if ((app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) && app.destination != null) reset_destination();
            if (app.level.mission == app.missionTypes.fortress && app.fortress != null) app.reset_fortress();
            if (app.level.mission == app.missionTypes.boss && app.boss != null) app.reset_boss();
            if (app.level.mission == app.missionTypes.race && app.asteroidsObject != null) app.reset_asteroids();
            app.updateSettings();

            app.init_hud();

            app.missionObjectives(app.level.mission);

            // objectives
            objectives_completed = 0;
            app.missionCompleted = false;

            app.objective_find_complete = false;
            app.objective_boss_complete = false;
            app.objective_turrets_complete = false;
            app.objective_core_complete = false;
            app.objective_survive_complete = false;
            app.objective_survival_complete = false;

            objective_find_triggered = false;
            objective_boss_triggered = false;
            objective_turrets_triggered = false;
            objective_core_triggered = false;
            objective_survival_triggered = false;
            objective_timer = app.level.timer;
            app.updateObjectives(true);
        }

        app.level_ready = true;
        app.update_softkeyBar();
    }

    function cleanup_stageAssets() {
        // remove objects of PREVIOUS stage
        switch (app.previous_stage) {
            case app.stages.grasslands:
                app.dispose_destination();
                app.dispose_fortress();
                break;
            case app.stages.lava:
                app.dispose_destination();
                app.dispose_fortress();
                break;
            case app.stages.desert:
                app.dispose_destination();
                app.dispose_boss();
                break;
            case app.stages.space:
                app.dispose_boss();
                app.dispose_asteroids();
                break;
        }
        app.renderer.renderLists.dispose();

        /* free memory */
        if (app.isKaiOS) {
            try {
                navigator.minimizeMemoryUsage();
                console.log('free memory');
            } catch (e) {
                console.log('minimizeMemoryUsage not supported');
            }
        }
    }

    var briefingTimeouts = [];
    var minDuration = 4000;
    var charMultiplier = 100;

    function missionBriefing() {
        var briefing_duration = 1000;
        briefingTimeouts = [];
        for (let i = 0; i < app.level.briefing.length; i++) {
            briefing_duration += Math.max(app.level.briefing[Math.max(i - 1, 0)].length * charMultiplier, minDuration);
            let timeout = setTimeout(function () { app.set_ticker(app.level.briefing[i]); }, briefing_duration);
            briefingTimeouts.push(timeout);
        }
    }

    var destination_radarPosition = new THREE.Vector2(0, 0);
    var destination_worldPosition2D = new THREE.Vector2(0, 0);

    app.update_destination = function () {
        if (app.frameCount % app.decal_refreshRate == 0) {
            app.destination.worldPosition2D.set(app.destination.asset.object.position.x, app.destination.asset.object.position.z);
            app.destination.radarPosition.copy(app.destination.worldPosition2D);
            app.destination.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
            app.destination.radarPosition.sub(app.playerObject.worldPosition2D);
            app.destination.angleToPlayer = app.angleToPoint2D(app.playerObject.worldPosition.x, app.playerObject.worldPosition.z, app.destination.asset.object.position.x, app.destination.asset.object.position.z);
            app.destination.distance = Math.round(app.destination.asset.object.position.distanceTo(app.playerObject.worldPosition));

            if (app.level.stageIndex != app.stages.space) {
                app.destination.asset.material.uniforms.decalMap_scale.value = app.decalMap_scale;
                app.destination.asset.material.uniforms.origin.value = app.playerObject.worldPosition2D;
                app.destination.asset.material.uniforms.worldRotation.value = app.playerObject.player.rotation.y;
                if (app.destination.distance < 150) {
                    app.objective_find_complete = true;
                }
            } else {
                if (app.destination.distance < 110000) {
                    app.objective_find_complete = true;
                }
            }

        }

        // animate lava flow
        if (app.level.destination[0] == app.destinations.volcano[0]) {
            if (!app.gamePaused) elapsedTime_mod = app.clock.elapsedTime % 100 * - 0.01;
            app.destination.asset.material.uniforms.shift_time.value = elapsedTime_mod;
        }

    }

    app.update_objectiveTimer = function () {
        if (objective_timer > 0) {
            objective_timer_tag.innerHTML = objective_timer.toFixed(1);
            objective_timer -= app.deltaTime;
        } else {
            objective_timer_tag.innerHTML = 0.0;
            if (app.level.mission == app.missionTypes.survival) {
                app.objective_survival_complete = true;
            } else if (app.level.mission == app.missionTypes.race && !app.objective_find_complete) {
                app.damage_player(100);
            }
        }
    }

    function spawn_destination() {
        var asset;
        if (app.destination != null) {
            app.deactivate_destination();
        } else {
            app.destination = {};
        }
        switch (app.level.destination[0]) {
            case app.destinations.platform[0]:
                app.platformObject = app.get_platform();
                asset = app.platformObject;
                break;
            case app.destinations.volcano[0]:
                app.volcanoObject = app.get_volcano();
                asset = app.volcanoObject;
                break;
            case app.destinations.planet[0]:
                app.planetObject = app.get_planet();
                asset = app.planetObject;
                break;
        }
        app.destination.asset = asset;
        app.destination.radarPosition = destination_radarPosition;
        app.destination.worldPosition2D = destination_worldPosition2D;
        app.destination.distance = 0.0;
        app.destination.angleToPlayer = 0.0;
        Object.seal(app.destination);
        app.destination.asset.object.position.copy(app.level.destinationPosition);
        app.destination.radarPosition.set(app.destination.asset.object.position.x, app.destination.asset.object.position.z);
        app.scene.add(app.destination.asset.object);
        app.destination.asset.object.visible = true;
    }

    app.deactivate_destination = function () {
        app.scene.remove(app.destination.asset.object);
        app.destination.asset.object.visible = false;
    }

    function reset_destination() {
        app.scene.add(app.destination.asset.object);
        app.destination.asset.object.visible = true;
        app.destination.asset.object.position.copy(app.level.destinationPosition);
        if (app.level.stageIndex != app.stages.space) app.raycastTargets.push(app.destination.asset.rayMesh);
    }

    var objectiveList;
    var objective_find_tag;
    var objective_boss_tag;
    var objective_turrets_tag;
    var objective_core_tag;
    var objective_destination_tag;
    var objective_survival_tag;

    var levelScore_tag;

    app.updateObjectives = function (force) {
        if (!app.missionCompleted) levelTimer += app.deltaTime;

        if (app.frameCount % 30 == 0 || force) {
            if (objective_count == 0) return;

            switch (app.level.mission) {
                case app.missionTypes.fortress:
                    if (objective_find_tag && app.objective_find_complete && !objective_find_triggered) {
                        objective_find_triggered = true;
                        objectives_completed++;
                        objective_find_tag.className = 'complete';
                        app.set_ticker('fortress found');
                        app.currentScore += 200;
                        app.refresh_score_hud();
                    }
                    if (objective_turrets_tag && app.objective_turrets_complete && !objective_turrets_triggered) {
                        objective_turrets_triggered = true;
                        objectives_completed++;
                        objective_turrets_tag.className = 'complete';
                        app.set_ticker('fortress turrets destroyed');
                        app.currentScore += 800;
                        app.refresh_score_hud();
                    }
                    if (objective_core_tag && app.objective_core_complete && !objective_core_triggered) {
                        objective_core_triggered = true;
                        objectives_completed++;
                        objective_core_tag.className = 'complete';
                        app.set_ticker('fortress core destroyed');
                    }
                    break;
                case app.missionTypes.boss:
                    app.objective_boss_complete = app.update_bossHealth();
                    if (objective_boss_tag && app.objective_boss_complete && !objective_boss_triggered) {
                        objective_boss_triggered = true;
                        objectives_completed++;
                        objective_boss_tag.className = 'complete';
                        app.set_ticker('you made it');
                    }
                    break;
                case app.missionTypes.travel:
                case app.missionTypes.race:
                    if (objective_destination_tag && app.objective_find_complete && !objective_find_triggered) {
                        objective_find_triggered = true;
                        objectives_completed++;
                        objective_destination_tag.className = 'complete';
                        app.set_ticker('destination reached');
                    }
                    break;
                case app.missionTypes.survival:
                    if (objective_survival_tag && app.objective_survival_complete && !objective_survival_triggered) {
                        objective_survival_triggered = true;
                        objectives_completed++;
                        objective_survival_tag.className = 'complete';
                        app.set_ticker('you made it');
                        objective_timer_tag.style.display = 'none';
                    }
                    break;
            }

            objective_count_tag.innerHTML = objectives_completed + '/' + objective_count;
            if (objectives_completed == objective_count && !app.missionCompleted) {
                app.missionCompleted = true;

                // set level progress
                if ((app.levelIndex + 1) > progressIndex) localStorage.setItem('progressIndex', app.levelIndex + 1);

                app.currentScore += 1000;
                app.refresh_score_hud();
                let health_bonus = Math.round(app.playerObject.health * 10);
                let finalScore = app.currentScore + health_bonus;
                levelScore_tag.innerHTML = "mission score: " + app.currentScore + "<br/>";
                levelScore_tag.innerHTML += "health bonus: " + health_bonus + "<br/>";

                if (app.level.mission != app.missionTypes.survival) {
                    let time_bonus = Math.round(Math.max(200 - levelTimer, 0) * 20);
                    finalScore += time_bonus;
                    levelScore_tag.innerHTML += "time bonus: " + time_bonus + "<br/>";
                }

                levelScore_tag.innerHTML += "<span class=\"finalScore\">final score: " + finalScore + "</span>";
                if (finalScore >= app.levelScores[app.levelIndex]) {
                    app.levelScores[app.levelIndex] = finalScore;
                    localStorage.setItem('levelScores', app.levelScores);
                }

                app.refresh_totalScore();
                app.menu_show('viewMissionCompleted', 3000);

                let hash = app.hashCode(app.levelScores.toString());
                let prevHash = localStorage.getItem('levelID') || 0;
                prevHash = parseInt(prevHash);
                if (prevHash == 2432837) return;
                localStorage.setItem('levelID', hash);
            }
        }
    }

    app.missionObjectives = function (mission) {
        levelScore_tag = document.getElementById('levelScore');

        switch (mission) {
            case app.missionTypes.fortress:
                objective_count = 3;
                objectiveList = `
                <li id='objective_find'>find fortress</li>
                <li id='objective_turrets'>destroy all fortress turrets</li>
                <li id='objective_core'>destroy energy core</li>
                `;
                objectives_entries_tag.innerHTML = objectiveList;
                objective_find_tag = document.getElementById('objective_find');
                objective_turrets_tag = document.getElementById('objective_turrets');
                objective_core_tag = document.getElementById('objective_core');
                objective_timer_tag.style.display = 'none';
                break;
            case app.missionTypes.boss:
                objective_count = 1;
                objectiveList = `
                        <li id='objective_boss'>defeat the boss</li>
                        `;
                objectives_entries_tag.innerHTML = objectiveList;
                objective_boss_tag = document.getElementById('objective_boss');
                objective_timer_tag.style.display = 'none';
                break;
            case app.missionTypes.travel:
                objective_count = 1;
                objectiveList = `
                    <li id='objective_destination'>reach your destination</li>
                    `;
                objectives_entries_tag.innerHTML = objectiveList;
                objective_destination_tag = document.getElementById('objective_destination');
                objective_timer_tag.style.display = 'none';
                break;
            case app.missionTypes.survival:
                objective_count = 1;
                objectiveList = `
                    <li id='objective_survival'>hang in there!</li>
                    `;
                objectives_entries_tag.innerHTML = objectiveList;
                objective_survival_tag = document.getElementById('objective_survival');
                objective_timer_tag.style.display = 'block';
                break;
            case app.missionTypes.race:
                objective_count = 1;
                objectiveList = `
                        <li id='objective_destination'>hurry up!</li>
                        `;
                objectives_entries_tag.innerHTML = objectiveList;
                objective_destination_tag = document.getElementById('objective_destination');
                objective_timer_tag.style.display = 'block';
                break;
        }
    }

    app.populateStageList = function (container) {
        container.innerHTML = '';
        if (localStorage.getItem('progressIndex')) progressIndex = localStorage.getItem('progressIndex');
        progressIndex = parseInt(progressIndex);

        for (let i = 0; i < stageCount; i++) {
            var ti = i * 10;
            var levelRange = app.get_levelRange(i);

            var entry = document.createElement("div");
            entry.className = 'navItem';
            entry.classList.add(app.stageList[i].name);
            entry.tabIndex = ti;

            var headline = document.createElement("h3");
            headline.innerHTML = app.stageList[i].title;
            entry.appendChild(headline);

            container.appendChild(entry);

            if (i == 4) {
                entry.classList.add('locked');
                return;
            }

            var score = document.createElement("p");
            var stageScore = 0;
            for (let i = levelRange[0]; i <= levelRange[1]; i++) {
                stageScore += app.levelScores[i];
            }
            score.innerHTML = 'score: ' + stageScore.toString();
            entry.appendChild(score);

            if (levelRange[0] > progressIndex && !app.unlockAllLevels) {
                entry.classList.add('locked');
            } else {
                entry.setAttribute('data-goToViewName', 'viewLevels');
            }
        }
    }

    var grid_container = null;

    app.populateLevelGrid = function (container, stageIndex) {
        grid_container = container;
        // set selected stage
        app.stageIndex = stageIndex;
        localStorage.setItem('stageIndex', app.stageIndex);
        app.stage = app.stageList[stageIndex];

        var levelRange = app.get_levelRange(stageIndex);

        container.innerHTML = '';
        if (localStorage.getItem('progressIndex')) progressIndex = localStorage.getItem('progressIndex');
        progressIndex = parseInt(progressIndex);

        for (let i = levelRange[0]; i <= levelRange[1]; i++) {
            // calculate tabIndex
            var startIndex = i - levelRange[0];
            var row = 10 * Math.floor(startIndex / gridColumns);
            var ti = row + startIndex % gridColumns;

            var entry = document.createElement("div");
            entry.className = 'navItem';
            entry.tabIndex = ti;
            entry.style.width = grid_itemWidth + '%';
            entry.style.height = grid_itemWidth + '%';

            var headline = document.createElement("h3");
            headline.innerText = app.levelList[i].name;
            entry.appendChild(headline);

            var difficulty = document.createElement("span");
            var difficulty_name;
            switch (app.levelList[i].difficulty) {
                case app.difficulty.easy:
                    difficulty_name = 'easy';
                    break;
                case app.difficulty.medium:
                    difficulty_name = 'medium';
                    break;
                case app.difficulty.hard:
                    difficulty_name = 'hard';
                    break;
            }
            difficulty.innerText = difficulty_name;
            entry.appendChild(difficulty);

            var score = document.createElement("span");
            score.innerText = app.levelScores[i].toString();
            entry.appendChild(score);

            container.appendChild(entry);

            if (i > progressIndex && !app.unlockAllLevels) {
                entry.classList.add('locked');
            } else {
                entry.setAttribute('data-function', 'play');
                entry.setAttribute('data-level', i);
            }
        }
    }

    app.update_levelGrid = function () {
        if (grid_container) app.populateLevelGrid(grid_container, app.stageIndex);
    }

    app.get_levelRange = function (stageIndex) {
        let levelCount = 0;
        for (let i = 0; i <= stageIndex; i++) {
            levelCount += app.stageList[i].levelCount;
        }
        let firstLevelIndex = levelCount - app.stageList[stageIndex].levelCount;
        let lastLevelIndex = levelCount - 1;

        return [firstLevelIndex, lastLevelIndex];
    }

    return app;
}(MODULE));