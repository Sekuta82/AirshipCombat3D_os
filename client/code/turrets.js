(function (app) {

    var turret_fireDistance;
    var turret_fireDelay;
    var turret_startHealth;

    var turret_spawn_delay = 0;

    app.init_turrets = function () {
        switch (app.level.difficulty) {
            case 0:
                turret_fireDelay = 2;
                turret_fireDistance = 600;
                turret_startHealth = 40;
                break;
            case 1:
                turret_fireDelay = 1.5;
                turret_fireDistance = 700;
                turret_startHealth = 80;
                break;
            case 2:
                turret_fireDelay = 1;
                turret_fireDistance = 800;
                turret_startHealth = 160;
                break;
        }

        if (app.turret_pool.length > 0) return;
        // fill turret pool
        for (let i = 0; i < app.turret_pool_size; i++) {
            var turret = spawn_turret(i);
            turret.asset.object.visible = false;
            app.turret_pool.push(turret);
            turret.asset.object.frustumCulled = false;
        }
    }

    app.reset_turrets = function () {
        for (let i = 0; i < app.turret_pool.length; i++) {
            app.removeEnemyTarget(app.turret_pool[i]);
        }
    }

    function spawn_turret(index) {
        let turret = app.get_turret(index);
        let worldPosition = new THREE.Vector3(0, 0);
        let radarPosition = new THREE.Vector2(9999, 0);
        turret.gun.position.set(0, 0, 0);

        let object = {
            isFree: true,
            asset: turret,
            location: 0,
            interval: 0.0,
            distance: 0.0,
            health: turret_startHealth,
            worldPosition: worldPosition,
            radarPosition: radarPosition,
            worldRotationY: 0.0,
            turnLimit: 0.0
        };
        Object.seal(object);
        return object;
    }

    app.activate_turret = function (position, location, rotation, turnLimit) {
        // get a pool turret
        for (let i = 0; i < app.turret_pool.length; i++) {
            if (app.turret_pool[i].isFree) {
                let turret = app.turret_pool[i];
                turret.isFree = false;
                turret.health = turret_startHealth;
                turret.interval = 0.0;
                turret.location = location;

                if (turnLimit) turret.turnLimit = turnLimit;

                switch (location) {
                    case app.turretLocations.terrain:
                        app.turret_group.add(turret.asset.object);
                        turret.asset.material.uniforms.decal_channels.value = app.decalChannels.all;
                        break;
                    case app.turretLocations.fortress:
                        app.fortress.asset.turrets.add(turret.asset.object);
                        turret.asset.material.uniforms.decal_channels.value = app.decalChannels.player_tunnels;
                        break;
                }

                turret.asset.object.position.copy(position);
                turret.asset.object.rotation.set(0, 0, 0, 0);
                if (rotation) turret.asset.object.rotation.y = rotation;

                turret.asset.pivot.getWorldPosition(turret.worldPosition);
                turret.radarPosition.set(9999, 0);
                turret.asset.object.visible = true;
                return;
            }
        }
    }

    var freeTurrets;
    var skyland_turrets_count = 99;
    var current_turret;
    var loop_start = 0;
    var loop_length = 0;

    var turrets_section = Math.floor(app.turret_pool_size / 3);

    app.update_turrets = function () {
        // sort array by distance
        if (app.frameCount % 30 == 0) {
            app.turret_pool.sort(function (a, b) { return a.distance - b.distance });
        }

        // process 1/3 per frame
        loop_start = app.frameCount % 3 * turrets_section;
        loop_length = loop_start + turrets_section;
        if (app.frameCount % app.lockon_refreshRate == 0) {
            app.lockOnTarget = {};
            freeTurrets = app.turret_pool_size;
            if (skyland_turrets_count == 0) app.objective_turrets_complete = true;
            skyland_turrets_count = 0;
        }

        for (let i = loop_start; i < loop_length; i++) {
            current_turret = app.turret_pool[i];
            if (!current_turret.isFree) {
                freeTurrets--;
                current_turret.asset.pivot.getWorldPosition(current_turret.worldPosition);
                current_turret.distance = Math.round(current_turret.worldPosition.distanceTo(app.playerObject.worldPosition));
                current_turret.radarPosition.set(current_turret.worldPosition.x, current_turret.worldPosition.z);
                current_turret.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
                current_turret.radarPosition.sub(app.playerObject.worldPosition2D);

                if (current_turret.distance < turret_fireDistance) {
                    current_turret.interval += app.deltaTime_triple;
                    // angle to player on XZ plane
                    let angleY = app.angleToPoint2D(app.playerObject.movingTarget_worldPosition.x, app.playerObject.movingTarget_worldPosition.z, current_turret.worldPosition.x, current_turret.worldPosition.z);
                    if (isNaN(angleY)) return;

                    current_turret.worldRotationY = app.get_parentRotationY(current_turret.asset.pivot);
                    angleY -= current_turret.worldRotationY;
                    if (current_turret.turnLimit > 0.0) {
                        angleY = app.alignRotation(angleY);
                        // limit angle
                        angleY = Math.min(Math.max(angleY, -current_turret.turnLimit), current_turret.turnLimit);
                        current_turret.asset.pivot.rotation.y = THREE.Math.lerp(current_turret.asset.pivot.rotation.y, angleY, app.deltaTime_triple);
                    } else {
                        current_turret.asset.pivot.rotation.y = angleY;
                    }

                    // angle to player on vertical plane (sin(a) = heightDiff/distance)
                    let angleX = -(app.playerObject.movingTarget_worldPosition.y - current_turret.worldPosition.y) / current_turret.distance;
                    angleX = Math.min(Math.max(angleX, -0.6), 0.3);
                    current_turret.asset.gun.rotation.x = THREE.Math.lerp(current_turret.asset.gun.rotation.x, angleX, app.deltaTime_triple);
                    
                    // fire rocket
                    if (angleX > -0.6 && angleX < 0.3) {
                        if (current_turret.interval > turret_fireDelay) {
                            current_turret.interval = 0.0;
                            app.shoot_rocket(app.enemyRocket_power, current_turret);
                        }
                    }

                    // decals
                    if (app.frameCount % app.decal_refreshRate == 0 && app.shadowDecals_on) {
                        current_turret.asset.material.uniforms.decalMap_scale.value = app.decalMap_scale;
                        current_turret.asset.material.uniforms.origin.value = app.playerObject.worldPosition2D;
                        current_turret.asset.material.uniforms.worldRotation.value = app.playerObject.player.rotation.y;
                    }

                } else if (current_turret.distance > app.turret_spawnDistance * 2 && current_turret.location == app.turretLocations.terrain) {
                    // clean up
                    app.removeEnemyTarget(current_turret);
                }

                // lock on to target
                // closest targets are in the first batch
                if (app.frameCount % app.lockon_refreshRate == 0) {
                    if (!app.lockOnTarget.hitObject) app.target_lockOn(current_turret);
                }

                // count fortress turrets
                if (current_turret.location == app.turretLocations.fortress) {
                    skyland_turrets_count++;
                }
            }
        }

        // spawn
        turret_spawn_delay += app.deltaTime_double;
        if (app.terrainVisible && app.frameCount % 30 == 2) {
            if (turret_spawn_delay > 3.1) {
                turret_spawn_delay = 0;
                if (freeTurrets > 0) {
                    let turret_origin = new THREE.Vector3(app.playerObject.worldPosition.x, 10, app.playerObject.worldPosition.z);
                    turret_origin.addScaledVector(app.movingDirection, -app.turret_spawnDistance);

                    let randomOffset = THREE.Math.randInt(-app.turret_spawnDistance, app.turret_spawnDistance);
                    let horizontalDirection = app.movingDirection.crossVectors(app.movingDirection, new THREE.Vector3(0, -1, 0));
                    turret_origin.addScaledVector(horizontalDirection, randomOffset);

                    let turret_hitPoint = app.raycast2terrain(turret_origin, app.downVector);
                    if (!turret_hitPoint || turret_hitPoint == 'undefined') {
                        return;
                    }

                    // don't spawn inside destination radius
                    let distance = Math.round(app.level.destinationPosition.distanceTo(turret_hitPoint.position));
                    if (distance < app.level.destination[1]) {
                        return;
                    }
                    // don't place in water or pit
                    if (turret_hitPoint && turret_hitPoint.color[0] > 80) {
                        // don't spawn when too close to other turret
                        for (let i = 0; i < app.turret_pool.length; i++) {
                            if (!app.turret_pool[i].isFree) {
                                let distance = Math.round(app.turret_pool[i].asset.object.position.distanceTo(turret_hitPoint.position));
                                if (distance < app.turret_spawnDistance * 0.4) return;
                            }
                        }
                        // add turret, if one is free
                        app.activate_turret(turret_hitPoint.position, app.turretLocations.terrain);
                    }
                }
            }
        }
    }

    return app;
}(MODULE));