(function (app) {

    const fighter_fireDistance = 500;
    const fighter_speed = 150;
    var fighter_fireDelay;

    var fighter_startHealth;
    var fighterCounter = 0;

    var fighter_spawn_delay = 0;

    app.init_fighters = function () {
        switch (app.level.difficulty) {
            case 0:
                fighter_fireDelay = 1.8;
                fighter_startHealth = 60;
                break;
            case 1:
                fighter_fireDelay = 1.6;
                fighter_startHealth = 90;
                break;
            case 2:
                fighter_fireDelay = 1.5;
                fighter_startHealth = 120;
                break;
        }

        if (app.fighter_pool.length > 0) return;

        // fill fighter pool
        for (let i = 0; i < app.fighter_pool_size; i++) {
            var fighter = spawn_fighter(i);
            fighter.asset.object.visible = false;
            app.fighter_pool.push(fighter);
            fighter.asset.object.frustumCulled = false;
        }
    }

    app.reset_fighters = function () {
        fighterCounter = 0;
        fighter_spawn_delay = 0;
        for (let i = 0; i < app.fighter_pool.length; i++) {
            app.removeFighter(app.fighter_pool[i]);
        }
    }

    function spawn_fighter(index) {
        let fighter = app.get_fighter(index);
        let worldPosition = new THREE.Vector3(0, 0, 0);
        let radarPosition = new THREE.Vector2(9999, 0);

        let object = {
            isFree: true,
            asset: fighter,
            interval: 0.0,
            distance: 0.0,
            lockedOn: false,
            health: fighter_startHealth,
            worldPosition: worldPosition,
            radarPosition: radarPosition
        };
        Object.seal(object);
        return object;
    }

    app.activate_fighter = function (position) {
        // get a pool fighter
        for (let i = 0; i < app.fighter_pool.length; i++) {
            if (app.fighter_pool[i].isFree) {
                let fighter = app.fighter_pool[i];
                fighter.isFree = false;
                fighter.health = fighter_startHealth;
                fighter.lockedOn = true;
                app.fighter_group.add(fighter.asset.object);
                fighter.asset.material.uniforms.decal_channels.value = app.decalChannels.all;
                fighter.asset.object.position.copy(position);
                fighter.radarPosition.set(9999, 0);
                fighter.asset.object.visible = true;
                fighterCounter++;
                return;
            }
        }
    }

    var freeFighters;
    var inverted_distance = 0;
    var turning_speed = 0;
    var fighter_directionAngle = 0;
    var player2fighter_directionAngle = 0;
    var angle2Player = 0;
    var fighter_roll_velocity = 0;
    var angle2Player_absolute = 0;
    var fighter_worldDirection = new THREE.Vector3();
    var player2fighter_direction = new THREE.Vector3();

    var fighter;

    app.update_fighters = function () {
        if (app.frameCount % app.lockon_refreshRate == 0) {
            app.lockOnTarget = {};
        }

        freeFighters = app.fighter_pool_size;

        // sort array by distance
        if (app.frameCount % 30 == 0) {
            app.fighter_pool.sort(function (a, b) { return a.distance - b.distance });
        }

        for (let i = 0; i < app.fighter_pool.length; i++) {
            fighter = app.fighter_pool[i];
            if (!fighter.isFree) {
                freeFighters--;
                fighter.interval += app.deltaTime;

                fighter.asset.object.translateZ(fighter_speed * app.deltaTime);
                fighter.distance = Math.round(fighter.worldPosition.distanceTo(app.playerObject.worldPosition));

                fighter.asset.object.getWorldPosition(fighter.worldPosition);
                if (app.frameCount % app.decal_refreshRate == 0) {
                    fighter.radarPosition.set(fighter.worldPosition.x, fighter.worldPosition.z);
                    fighter.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
                    fighter.radarPosition.sub(app.playerObject.worldPosition2D);
                }

                // pass player when close
                if (fighter.distance < 80) {
                    fighter.lockedOn = false;
                    setTimeout(function () { fighter.lockedOn = true; }, 9800);
                }

                inverted_distance = Math.max(5 - fighter.distance * 0.005, 1);
                if (fighter.lockedOn) {
                    turning_speed = inverted_distance;
                } else {
                    turning_speed = 0.2;
                }

                app.lazyLookAt(fighter.asset.object, app.playerObject.movingTarget_worldPosition, turning_speed);
                // avoid ground
                fighter.asset.object.position.y += Math.max(50 - fighter.asset.object.position.y, 0) * app.deltaTime;

                // rotate propellers
                fighter.asset.propellers[0].rotation.z -= app.deltaTime * 15.0;
                fighter.asset.propellers[1].rotation.z = fighter.asset.propellers[0].rotation.z;

                if (fighter.distance < fighter_fireDistance) {
                    // fly above player
                    fighter.asset.object.position.y += inverted_distance * app.deltaTime * 15;

                    if (app.frameCount % 3 == 0) {
                        // angle to player
                        // fighter direction
                        fighter.asset.object.getWorldDirection(fighter_worldDirection);
                        fighter_directionAngle = Math.atan2(fighter_worldDirection.x, fighter_worldDirection.z);
                        fighter_directionAngle = app.alignRotation(fighter_directionAngle);

                        // direction to player
                        player2fighter_direction.subVectors(app.playerObject.worldPosition, fighter.worldPosition).normalize();
                        player2fighter_directionAngle = Math.atan2(player2fighter_direction.x, player2fighter_direction.z);
                        player2fighter_directionAngle = app.alignRotation(player2fighter_directionAngle);

                        angle2Player = (fighter_directionAngle - player2fighter_directionAngle);
                        // align rotation
                        if (angle2Player > app.pi) {
                            angle2Player -= app.pi2;
                        } else if (angle2Player < -app.pi) {
                            angle2Player += app.pi2;
                        }

                        angle2Player_absolute = Math.abs(angle2Player);

                        if (fighter.lockedOn) {
                            // fire rocket
                            if (fighter.interval > fighter_fireDelay) {
                                if (angle2Player_absolute < 0.14) {
                                    fighter.interval = 0.0;
                                    app.shoot_rocket(app.enemyRocket_power, fighter);
                                }
                            }
                        }
                    }

                } else {
                    angle2Player = 0;
                }

                fighter_roll_velocity = THREE.Math.lerp(fighter_roll_velocity, angle2Player, app.deltaTime_half);
                fighter.asset.object.children[0].rotation.z = fighter_roll_velocity;

                // lock on to target
                if (app.frameCount % app.lockon_refreshRate == 0) {
                    if (!app.lockOnTarget.hitObject) app.target_lockOn(fighter);
                }
            }
        }

        // spawn
        fighter_spawn_delay += app.deltaTime;
        if (fighter_spawn_delay > 7.5 && fighterCounter < app.level.maxFighters) {
            fighter_spawn_delay = 0;
            if (freeFighters > 0) {
                let fighter_origin = new THREE.Vector3(app.playerObject.worldPosition.x, 10, app.playerObject.worldPosition.z);
                let randomOffset = THREE.Math.randInt(-app.fighter_spawnDistance, app.fighter_spawnDistance);
                fighter_origin.x += randomOffset;
                if (randomOffset > 0) {
                    fighter_origin.z += randomOffset - app.fighter_spawnDistance * 2;
                } else {
                    fighter_origin.z += randomOffset + app.fighter_spawnDistance * 2;
                }

                // add fighter, if one is free
                app.activate_fighter(fighter_origin);
            }
        }
    }

    app.removeFighter = function (fighter) {
        // return to pool
        fighter.interval = 0.0;
        fighter.asset.object.visible = false;
        fighter.asset.object.position.copy(app.instance_parkingPosition);
        fighter.isFree = true;
        fighter.lockedOn = false;
    }

    return app;
}(MODULE));