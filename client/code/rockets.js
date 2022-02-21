(function (app) {

    const playerRocket_pool_size = 10;
    const enemyRocket_pool_size = 10;
    const mp_rocket_pool_size = playerRocket_pool_size * app.mp_playerLimit; // can be optimized by reducing client rockets
    const rocket_age = 5;

    app.init_rockets = () => {
        if (app.enemyRocket_pool.length > 0) return;

        // fill rocket pools
        for (let i = 0; i < enemyRocket_pool_size; i++) {
            var rocket = spawn_enemyRocket();
            rocket.asset.visible = false;
            app.enemyRocket_pool.push(rocket);
            app.rocket_group.add(rocket.asset);
            //rocket.asset.frustumCulled = false;
        }

        for (let i = 0; i < playerRocket_pool_size; i++) {
            let rocket = spawn_playerRocket();
            app.playerRocket_pool.push(rocket);
            app.rocket_group.add(rocket.asset);
            rocket.asset.visible = false;
        }
    }

    app.init_mp_rockets = () => {
        for (let i = 0; i < mp_rocket_pool_size; i++) {
            let rocket = spawn_playerRocket();
            app.mp_rocket_pool.push(rocket);
            app.rocket_group.add(rocket.asset);
            rocket.asset.visible = false;
        }
    }

    function spawn_enemyRocket() {
        var rocket = app.get_rocket(app.turret_rocket_color);
        rocket.position.copy(app.instance_parkingPosition);

        let object = {
            isFree: true,
            asset: rocket,
            distance: 0.0,
            power: 10
        };
        Object.seal(object);
        return object;
    }

    function spawn_playerRocket() {
        var rocket = app.get_rocket(app.player_rocket_color);
        rocket.position.copy(app.instance_parkingPosition);

        var object = {
            isFree: true,
            asset: rocket,
            target: {},
            distance: 0.0,
            age: 0.0,
            spawnTime: 0,
            power: 100,
            speed: 1
        };
        Object.seal(object);
        return object;
    }

    var turretObstacle;
    var obstacleDirection = new THREE.Vector3();
    var enemy_rocket;

    app.shoot_rocket = function (power, parent, worldPosition) {
        // get a pool enemy_rocket
        // check for obstacles between parent and player
        obstacleDirection.copy(app.playerObject.worldPosition);
        (parent.worldPosition) ? obstacleDirection.sub(parent.worldPosition) : obstacleDirection.sub(worldPosition);
        obstacleDirection.normalize();
        turretObstacle = (parent.worldPosition) ? app.raycast2object(parent.worldPosition, obstacleDirection) : app.raycast2object(worldPosition, obstacleDirection);
        if (turretObstacle && parent != null) {
            let distance = (parent.distance) ? parent.distance : Math.round(worldPosition.distanceTo(app.playerObject.worldPosition));
            // console.log('parent obstacle', turretObstacle.name, turretObstacle.distance, 'distance to player', distance);
            if (distance > turretObstacle.distance) return;
        }

        for (let i = 0; i < app.enemyRocket_pool.length; i++) {
            if (app.enemyRocket_pool[i].isFree) {
                enemy_rocket = app.enemyRocket_pool[i];
                enemy_rocket.asset.visible = true;
                enemy_rocket.isFree = false;
                enemy_rocket.power = power;
                (parent.worldPosition) ? enemy_rocket.asset.position.copy(parent.worldPosition) : enemy_rocket.asset.position.copy(worldPosition);
                enemy_rocket.asset.scale.x = power;
                enemy_rocket.asset.material.uniforms.exposure.value = 20;
                if (parent.asset) {
                    if (parent.asset.gun) {
                        parent.asset.gun.getWorldQuaternion(enemy_rocket.asset.rotation);
                    } else {
                        parent.asset.object.getWorldQuaternion(enemy_rocket.asset.rotation);
                    }
                } else {
                    parent.getWorldQuaternion(enemy_rocket.asset.rotation);
                }

                if (app.soundfx_on) app.play_enemyRocket_sound(enemy_rocket.asset, power);
                return;
            }
        }
    }

    var worldRotation = new THREE.Quaternion;
    var charge = 0;
    var charge_heat = 0;

    var shot_requested = false;
    var shot_requested_power = 0;

    app.shot_request = function (power) {
        shot_requested = true;
        shot_requested_power = Math.max(10, power);
    }

    var player_rocket;

    app.shoot_playerRocket = function (power) {
        shot_requested = false;
        clearInterval(app.chargeInterval);
        charge_heat = app.playerObject.weaponCharge * 0.1;
        app.playerObject.weaponCharge = 0;

        // get a pool player_rocket
        if (app.playerObject.weaponHeat >= 95) return;
        for (let i = 0; i < app.playerRocket_pool.length; i++) {
            if (app.playerRocket_pool[i].isFree) {
                player_rocket = app.playerRocket_pool[i];
                player_rocket.isFree = false;
                player_rocket.power = power;
                player_rocket.speed = app.playerObject.speed;
                charge = Math.max(power * 0.01, 0.2);
                player_rocket.asset.position.copy(app.playerObject.rocketLauncher_worldPosition);
                player_rocket.asset.scale.x = charge * 15;
                player_rocket.asset.material.uniforms.exposure.value = charge * 30;

                // get world rotation
                app.playerObject.asset.rocketLauncher.getWorldQuaternion(worldRotation);
                player_rocket.asset.quaternion.copy(worldRotation);

                // lock on target
                let target = app.lockOnTarget;
                let spawnTime = app.clock.elapsedTime;

                player_rocket.target = target;
                player_rocket.spawnTime = spawnTime;
                player_rocket.asset.visible = true;

                // heat up weapon
                app.playerObject.weaponHeat += 100 / playerRocket_pool_size + charge_heat;

                // online
                if (app.multiplayerMode) {
                    app.send_shot(i, power, app.playerObject.rocketLauncher_worldPosition, worldRotation, Math.round(app.playerObject.speed));
                }

                if (app.soundfx_on) app.play_playerRocket_sound(player_rocket.asset, power);
                return;
            }
        }
    }

    app.shoot_mp_rocket = function (pos, rot, pIndex, rIndex, power, speed, latency) {
        let i = pIndex * 10 + rIndex;
        player_rocket = app.mp_rocket_pool[i];
        if (!player_rocket.isFree) app.remove_mp_rocket(player_rocket);
        player_rocket.isFree = false;
        player_rocket.power = power;
        player_rocket.speed = speed;
        charge = Math.max(power * 0.01, 0.2);
        player_rocket.asset.position.set(pos[0], pos[1], pos[2]);
        player_rocket.asset.rotation.set(rot[0], rot[1], rot[2]);
        player_rocket.asset.scale.x = charge * 15;
        player_rocket.asset.material.uniforms.exposure.value = charge * 30;

        let spawnTime = app.clock.elapsedTime - latency * 0.001;

        player_rocket.spawnTime = spawnTime;
        player_rocket.asset.visible = true;

        if (app.soundfx_on) app.play_playerRocket_sound(player_rocket.asset, power);

        // extrapolate
        // delay for one frame to start from player
        setTimeout(() => { player_rocket.asset.translateZ((app.playerRocket_speed + speed) * latency * 0.001 + app.deltaTime) }, app.deltaTime * 1000)
        // console.log("fire!!1", i);
        return;
    }

    var terrain_hitPoint;
    function check_collision_with_terrain(rocket, owner) {
        // owner 0: player
        // owner 1: enemy
        if (rocket.asset.position.y < 0) {
            terrain_hitPoint = app.raycast2terrain(rocket.asset.position, app.downVector);
            if (terrain_hitPoint) {
                if (terrain_hitPoint.position.y >= rocket.asset.position.y) {
                    if (owner == 0) {
                        app.remove_playerRocket(rocket);
                    } else {
                        app.remove_enemyRocket(rocket);
                    }
                    terrain_hitPoint.position.y += 5;
                    app.spawn_smallExplosion(rocket.power * 0.5, 50, terrain_hitPoint.position, owner);
                    return;
                }
            }
        }
    }

    var rocketScale = 0.0;
    var rocketTargetScale = 0.0;

    function animate_launch(rocket) {
        rocketTargetScale = rocket.power * 0.1;
        rocketScale = rocket.asset.scale.x;
        if (rocketScale >= rocketTargetScale + 2) {
            rocketScale -= 2;
            rocket.asset.scale.set(rocketScale, rocketScale, rocketScale);
        } else {
            rocket.asset.scale.set(rocketTargetScale, rocketTargetScale, rocketTargetScale);
        }
        if (rocket.asset.material.uniforms.exposure.value >= 5) {
            rocket.asset.material.uniforms.exposure.value -= app.deltaTime * 30;
        }
    }

    var rocket_worldPosition = new THREE.Vector3();

    app.update_enemyRockets = function () {
        for (let i = 0; i < app.enemyRocket_pool.length; i++) {
            let rocket = app.enemyRocket_pool[i];
            if (!rocket.isFree) {
                animate_launch(rocket);

                rocket.asset.translateZ(app.enemyRocket_speed * (app.deltaTime / app.collisionIterations)); // move rocket
                rocket.distance = Math.round(rocket.asset.position.distanceTo(app.playerObject.worldPosition));

                if (app.terrainVisible && app.frameCount % app.rocket_terrainCollision_refreshRate == 1) {
                    check_collision_with_terrain(rocket, 0);
                }

                if (rocket.distance > app.rocket_destructDistance) {
                    app.remove_enemyRocket(rocket);
                } else if (rocket.distance > 0 && rocket.distance < 10) {
                    // if (app.debuggenzeit) console.log("player hit by rocket");
                    rocket.asset.getWorldPosition(rocket_worldPosition)
                    app.spawn_smallExplosion(10, 50, rocket_worldPosition, 1);
                    app.remove_enemyRocket(rocket);
                    app.damage_player(rocket.power);
                }
            }
        }
    }

    var playerRocket_direction = new THREE.Vector3(0, 0, 0);
    var playerRocket_raycast_target = {};
    var inverted_distance = 0;

    app.update_playerRockets = function () {
        // delayed shot
        if (shot_requested && app.frameCount % 3 == 1) {
            app.shoot_playerRocket(shot_requested_power);
        }

        for (let i = 0; i < app.playerRocket_pool.length; i++) {
            let rocket = app.playerRocket_pool[i];
            if (!rocket.isFree) {
                animate_launch(rocket);

                if (app.multiplayerMode) {
                    rocket.asset.translateZ((app.playerRocket_speed + rocket.speed) * app.deltaTime); // move rocket
                } else {
                    rocket.asset.translateZ((app.playerRocket_speed + rocket.speed) * (app.deltaTime / app.collisionIterations)); // move rocket
                }
                if (!app.multiplayerMode) {
                    if (rocket.target.hitObject) {  // target lock
                        rocket.distance = Math.round(rocket.asset.position.distanceTo(rocket.target.hitObject.worldPosition));
                        inverted_distance = Math.max(20 - rocket.distance * 0.005, 0.5);
                        app.lazyLookAt(rocket.asset, rocket.target.hitObject.worldPosition, inverted_distance);

                        // target hit
                        if (rocket.target.hitObject && rocket.distance < 5) {
                            // if (app.debuggenzeit) console.log("player rocket hit target");
                            app.whiteOut(rocket.target.hitObject.asset.material);
                            app.spawn_smallExplosion(rocket.power, 50, rocket.target.hitObject.worldPosition, 0);
                            app.damageEnemyTarget(rocket.power, rocket.target.hitObject);
                            app.remove_playerRocket(rocket);
                        }
                    } else { // no lock, raycast forward
                        if (app.terrainVisible && app.frameCount % app.rocket_terrainCollision_refreshRate == 3) {
                            check_collision_with_terrain(rocket, 1);
                        }

                        // collide with object
                        rocket.asset.getWorldDirection(playerRocket_direction);
                        playerRocket_raycast_target = app.raycast2object(rocket.asset.position, playerRocket_direction);
                        if (playerRocket_raycast_target) {
                            // target hit
                            if (playerRocket_raycast_target.distance < 10) {
                                if (playerRocket_raycast_target.object.name == "fortress_raytarget"
                                    || playerRocket_raycast_target.object.name == "destination_raytarget") {
                                } else if (playerRocket_raycast_target.object.name == "fortress_turret_raytarget") {
                                    app.fortress_turret_hit(rocket.power, playerRocket_raycast_target);
                                    app.whiteOut(app.fortress.asset.gun_material);
                                } else if (playerRocket_raycast_target.object.name == "boss_raytarget") {
                                    app.boss_hit(rocket.power, playerRocket_raycast_target);
                                    app.whiteOut(app.boss.asset.material);
                                } else if (playerRocket_raycast_target.object.name == "boss_gun_raytarget") {
                                    app.boss_gun_hit(rocket.power, playerRocket_raycast_target);
                                    app.whiteOut(playerRocket_raycast_target.object.parent.material);
                                } else if (playerRocket_raycast_target.object.name == "fortress_doors_raytarget") { // fortress door
                                    app.addToScore(300, playerRocket_raycast_target);
                                    // remove doors
                                    app.removeMeshFromScene(playerRocket_raycast_target.object, true);
                                    app.raycastTargets.splice(app.raycastTargets.indexOf(playerRocket_raycast_target.object), 1);
                                    app.playerObject.crosshairObject = null;
                                } else if (playerRocket_raycast_target.object.name == "fortress_core_raytarget") { // fortress core
                                    if (!app.fortress.core_destroyed) {
                                        app.addToScore(500, playerRocket_raycast_target);
                                        app.whiteOut(app.fortress.asset.core_material);
                                    }
                                    // remove core
                                    app.fortress.core_destroyed = true;
                                    app.objective_core_complete = true;
                                }
                                app.remove_playerRocket(rocket);
                                app.spawn_smallExplosion(rocket.power, 50, playerRocket_raycast_target.point, 0);
                            }
                        }
                    }
                } else {
                    if (app.terrainVisible && app.frameCount % app.rocket_terrainCollision_refreshRate == 3) {
                        check_collision_with_terrain(rocket, 1);
                    }
                }

                // rocket too old
                rocket.age = app.clock.elapsedTime - rocket.spawnTime;
                if (rocket.age > rocket_age) {
                    app.remove_playerRocket(rocket);
                }
            }
        }
    }

    app.update_mp_rockets = function () {
        for (let i = 0; i < app.mp_rocket_pool.length; i++) {
            let rocket = app.mp_rocket_pool[i];
            if (!rocket.isFree) {
                animate_launch(rocket);

                rocket.asset.translateZ(app.playerRocket_speed * app.deltaTime + (rocket.speed * app.deltaTime)); // move rocket

                if (app.terrainVisible && app.frameCount % app.rocket_terrainCollision_refreshRate == 3) {
                    check_collision_with_terrain(rocket, 1);
                }

                // rocket too old
                rocket.age = app.clock.elapsedTime - rocket.spawnTime;
                if (rocket.age > rocket_age) {
                    app.remove_mp_rocket(rocket);
                }
            }
        }
    }

    app.remove_enemyRocket = function (rocket) {
        // return to pool
        if (rocket) {
            // remove single rocket
            rocket.asset.visible = false;
            rocket.asset.position.copy(app.instance_parkingPosition);
            rocket.isFree = true;
            rocket.distance = 0;
            rocket.asset.remove(app.fireball_sound);
        } else {
            for (let i = 0; i < app.enemyRocket_pool.length; i++) {
                // remove all rockets
                var obj = app.enemyRocket_pool[i];
                obj.asset.visible = false;
                obj.asset.position.copy(app.instance_parkingPosition);
                obj.isFree = true;
                obj.distance = 0;
            }
        }
    }

    app.remove_playerRocket = function (rocket) {
        // return to pool
        if (rocket) {
            // remove single rocket
            rocket.asset.visible = false;
            rocket.asset.position.copy(app.instance_parkingPosition);
            rocket.isFree = true;
            rocket.target = {};
            rocket.asset.remove(app.fireball_sound);
        } else {
            // remove all rockets
            app.lockOnTarget = {};
            for (let i = 0; i < app.playerRocket_pool.length; i++) {
                if (!app.playerRocket_pool[i].isFree) {
                    var obj = app.playerRocket_pool[i];
                    obj.asset.visible = false;
                    obj.asset.position.copy(app.instance_parkingPosition);
                    obj.isFree = true;
                    obj.target = {};
                }
            }
        }
    }

    app.remove_mp_rocket = function (rocket) {
        // return to pool
        if (rocket) {
            // remove single rocket
            rocket.asset.visible = false;
            rocket.asset.position.copy(app.instance_parkingPosition);
            rocket.isFree = true;
            rocket.target = {};
            rocket.asset.remove(app.fireball_sound);
        } else {
            // remove all rockets
            app.lockOnTarget = {};
            for (let i = 0; i < app.mp_rocket_pool.length; i++) {
                if (!app.mp_rocket_pool[i].isFree) {
                    var obj = app.mp_rocket_pool[i];
                    obj.asset.visible = false;
                    obj.asset.position.copy(app.instance_parkingPosition);
                    obj.isFree = true;
                    obj.target = {};
                }
            }
        }
    }

    app.damageEnemyTarget = function (damage, target) {
        app.addToScore(damage, target);

        target.health -= damage;
        if (target.health <= 0) {
            clear_lockonTarget();
            app.spawn_smallExplosion(100, 50, target.worldPosition, 0);
            app.removeEnemyTarget(target);
        }
    }

    app.removeEnemyTarget = function (target) {
        // return to pool
        target.interval = 0.0;
        target.distance = 9999;
        target.asset.object.visible = false;
        target.asset.object.position.copy(app.instance_parkingPosition);
        target.turnLimit = 0.0;
        target.worldRotationY = 0.0;
        target.isFree = true;
        let parent = target.asset.object.parent;
        if (parent) {
            parent.remove(target.asset.object);
        }
    }

    function clear_lockonTarget() {
        for (let i = 0; i < app.playerRocket_pool.length; i++) {
            if (!app.playerRocket_pool[i].isFree) {
                app.playerRocket_pool[i].target = {};
            }
        }
    }

    return app;
}(MODULE));