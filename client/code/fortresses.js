(function (app) {

    const skyland_speed = 10;
    const tank_speed = 10;
    var velocity = 1.0;
    var tank_turret_destroyed = false;

    app.init_fortress = function () {
        if (app.fortress != null) app.deactivate_fortress();

        switch (app.level.stageIndex) {
            case app.stages.grasslands:
                if (app.skylandObject != null) {
                    app.scene.add(app.fortress.asset.object);
                    return;
                }
                break;
            case app.stages.lava:
                if (app.tankObject != null) {
                    app.scene.add(app.fortress.asset.object);
                    return;
                }
                break;
        }
        spawn_fortress();
    }

    function spawn_fortress() {
        var worldPosition = new THREE.Vector3();
        var worldPosition2D = new THREE.Vector2(0.0, 0.0);
        var radarPosition = new THREE.Vector2(0.0, 0.0);
        radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y);
        var tunnel_trigger_distance = 0.0;

        var fortress = null;
        switch (app.level.stageIndex) {
            case app.stages.grasslands:
                app.skylandObject = app.get_skyland();
                fortress = app.skylandObject;
                tunnel_trigger_distance = Math.round(fortress.triggers.tunnel_front.position.distanceTo(fortress.triggers.tunnel_rear.position));
                break;
            case app.stages.lava:
                app.tankObject = app.get_tank();
                fortress = app.tankObject;
                break;
        }

        var object = {
            asset: fortress,
            distance: 0.0,
            angleToPlayer: 0.0,
            worldPosition: worldPosition,
            worldPosition2D: worldPosition2D,
            radarPosition: radarPosition,
            tunnel_trigger_distance: tunnel_trigger_distance,
            core_destroyed: false,
            health: 0
        };
        Object.seal(object);
        app.fortress = object;
        app.fortress.asset.object.position.copy(app.level.destinationPosition);

        app.scene.add(fortress.object);
    }

    function placeTurrets() {
        for (let i = 0; i < app.fortress.asset.turretPositions.length; i++) {
            let position = new THREE.Vector3();
            position.copy(app.fortress.asset.turretPositions[i]);
            let rotation = app.fortress.asset.turretRotations[i];
            let turnLimit = 1.8;
            app.activate_turret(position, app.turretLocations.fortress, rotation, turnLimit);
        }
    }

    var elapsedTime_mod = 0;

    app.deactivate_fortress = function () {
        app.scene.remove(app.fortress.asset.object);
        app.fortress.asset.object.visible = false;
    }

    app.reset_fortress = function () {
        if (app.level.mission != app.missionTypes.fortress) return;

        app.fortress.asset.object.visible = true;
        app.scene.add(app.fortress.asset.object);
        app.fortress.asset.object.position.copy(app.level.destinationPosition);
        app.fortress.asset.object.rotation.y = 0;
        app.fortress.core_destroyed = false;
        velocity = 1.0;

        switch (app.level.stageIndex) {
            case app.stages.grasslands:
                app.fortress.asset.object.add(app.fortress.asset.doors_front_group);
                app.fortress.asset.object.add(app.fortress.asset.doors_rear_group);

                app.raycastTargets.push(app.fortress.asset.rayMesh);
                app.raycastTargets.push(app.fortress.asset.core_rayMesh);
                app.raycastTargets.push(app.fortress.asset.door_front_rayMesh);
                app.raycastTargets.push(app.fortress.asset.door_rear_rayMesh);

                if (app.level.turrets) placeTurrets();
                break;
            case app.stages.lava:
                tank_turret_destroyed = false;
                app.fortress.health = tank_health;
                app.fortress.asset.front.add(app.fortress.asset.doors_front_group);
                app.raycastTargets.push(app.fortress.asset.front_rayMesh);
                app.raycastTargets.push(app.fortress.asset.rear_rayMesh);
                app.raycastTargets.push(app.fortress.asset.gun_rayMesh);
                app.raycastTargets.push(app.fortress.asset.core_rayMesh);
                app.raycastTargets.push(app.fortress.asset.door_front_rayMesh);
                break;
        }
        app.fortress.asset.material.uniforms.colorMap.value.wrapS = app.fortress.asset.material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping; // set again, workaround
    }

    var wheel_rayOrigin_worldPosition = new THREE.Vector3();
    var wheel_hitPoints = [];
    var wheels_averageDistance = 0;
    var tank_current_speed;
    var wheel_current_heights = [];
    var tank_pitch;
    var tank_front_roll;
    var tank_rear_roll;

    app.update_fortress = function () {
        app.fortress.distance = Math.round(app.fortress.asset.object.position.distanceTo(app.playerObject.worldPosition));
        if (app.fortress.distance < 1500) app.objective_find_complete = true;
        app.fortress.worldPosition = app.fortress.asset.object.position;
        app.fortress.angleToPlayer = app.angleToPoint2D(app.playerObject.worldPosition.x, app.playerObject.worldPosition.z, app.fortress.worldPosition.x, app.fortress.worldPosition.z);
        if (!app.gamePaused) elapsedTime_mod = app.clock.elapsedTime % 10;

        if (app.frameCount % app.decal_refreshRate == 0) {
            app.fortress.worldPosition2D.set(app.fortress.asset.object.position.x, app.fortress.asset.object.position.z);
            app.fortress.radarPosition.copy(app.fortress.worldPosition2D);
            app.fortress.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
            app.fortress.radarPosition.sub(app.playerObject.worldPosition2D);
            app.fortress.asset.material.uniforms.decalMap_scale.value = app.fortress.asset.highlight_material.uniforms.decalMap_scale.value = app.decalMap_scale;
            app.fortress.asset.material.uniforms.origin.value = app.fortress.asset.highlight_material.uniforms.origin.value = app.playerObject.worldPosition2D;
            app.fortress.asset.material.uniforms.worldRotation.value = app.fortress.asset.highlight_material.uniforms.worldRotation.value = app.playerObject.player.rotation.y;
        }

        app.fortress.asset.highlight_material.uniforms.hightlight_time.value = elapsedTime_mod;

        switch (app.level.stageIndex) {
            case app.stages.grasslands:
                app.fortress.asset.object.rotation.y += app.deltaTime * 0.01;
                app.fortress.asset.object.translateZ(skyland_speed * app.deltaTime * velocity); // move fortress
                // rotate propellers
                for (let i = 0; i < app.fortress.asset.propellers.length; i++) {
                    app.fortress.asset.propellers[i].rotation.y += app.deltaTime * 8 * velocity;
                }
                for (let i = 0; i < app.fortress.asset.smallPropellers.length; i++) {
                    app.fortress.asset.smallPropellers[i].rotation.y += app.deltaTime * 4 * velocity;
                }

                if (!app.fortress.core_destroyed) {
                    app.fortress.asset.core_material.uniforms.hightlight_time.value = elapsedTime_mod;
                    // rotate cogs
                    for (let i = 0; i < app.fortress.asset.cogs.length; i++) {
                        app.fortress.asset.cogs[i].rotation.x += app.deltaTime_double;
                    }

                    // rotate core
                    app.fortress.asset.core_group.rotation.y += app.deltaTime;
                } else {
                    app.fortress.asset.core_material.uniforms.hightlight_time.value = 1;
                    // fall down
                    app.fortress.asset.object.position.y = THREE.Math.lerp(app.fortress.asset.object.position.y, 50, app.deltaTime * 0.05);
                    velocity -= velocity * app.deltaTime * 0.05;
                }
                break;
            case app.stages.lava:
                tank_current_speed = tank_speed * app.deltaTime * velocity;
                app.fortress.asset.object.rotation.y += app.deltaTime * 0.01;
                app.fortress.asset.object.translateZ(tank_current_speed); // move tank

                if (!app.fortress.core_destroyed) {
                    app.fortress.asset.core_material.uniforms.hightlight_time.value = elapsedTime_mod;

                    // rotate core
                    app.fortress.asset.core_group.rotation.y += app.deltaTime;
                } else {
                    app.fortress.asset.core_material.uniforms.hightlight_time.value = 1;
                }

                tank_current_speed *= 0.026;
                app.tankObject.wheel_meshs[0].rotation.x += tank_current_speed;
                app.tankObject.wheel_meshs[1].rotation.x += tank_current_speed;
                app.tankObject.wheel_meshs[2].rotation.x += tank_current_speed;
                app.tankObject.wheel_meshs[3].rotation.x += tank_current_speed;

                // check wheel distance to ground
                for (let i = 0; i < 4; i++) {
                    app.tankObject.wheel_rayOrigins[i].getWorldPosition(wheel_rayOrigin_worldPosition);
                    wheel_hitPoints[i] = app.raycast2terrain(wheel_rayOrigin_worldPosition, app.downVector);

                    if (wheel_hitPoints[i]) {
                        // stick wheel to ground
                        wheel_current_heights[i] = app.tankObject.wheels[i].position.y;
                        wheel_current_heights[i] = (wheel_current_heights[i] * 9 + wheel_hitPoints[i].position.y + 28) * 0.1;
                        app.tankObject.wheels[i].position.y = wheel_current_heights[i];

                        // move chassis
                        wheels_averageDistance = (wheels_averageDistance * 199 + wheel_hitPoints[i].position.y) * 0.005;
                        app.tankObject.chassis.position.y = wheels_averageDistance + 30;
                    }
                }

                tank_pitch = (app.tankObject.wheels[0].position.y + app.tankObject.wheels[1].position.y)
                    - (app.tankObject.wheels[2].position.y + app.tankObject.wheels[3].position.y);
                app.tankObject.chassis.rotation.x
                    = app.tankObject.wheels[0].rotation.x
                    = app.tankObject.wheels[1].rotation.x
                    = app.tankObject.wheels[2].rotation.x
                    = app.tankObject.wheels[3].rotation.x
                    = tank_pitch * -0.002;

                tank_front_roll = app.tankObject.wheels[0].position.y - app.tankObject.wheels[1].position.y;
                app.tankObject.chassis.children[0].rotation.z = tank_front_roll * 0.005;
                tank_rear_roll = app.tankObject.wheels[2].position.y - app.tankObject.wheels[3].position.y;
                app.tankObject.chassis.children[1].rotation.z = tank_rear_roll * 0.005;
                tank_turret();
                break;
        }
    }

    const turret_fireDistance = 1200;
    const turret_fireDelay = 3;
    var tank_turret_interval = 0;
    var tank_turret_worldRotationY;
    var tank_gun_pivot_worldPosition = new THREE.Vector3();
    var rocketLauncher_worldPosition = new THREE.Vector3();
    var tank_health = 650;

    function tank_turret() {
        if (tank_turret_destroyed) return;
        if (app.fortress.distance < turret_fireDistance) {
            tank_turret_interval += app.deltaTime;

            app.tankObject.gun_pivot.getWorldPosition(tank_gun_pivot_worldPosition);
            app.tankObject.rocketLauncher.getWorldPosition(rocketLauncher_worldPosition);

            // angle to player on XZ plane
            let angleY = app.angleToPoint2D(app.playerObject.movingTarget_worldPosition.x, app.playerObject.movingTarget_worldPosition.z, tank_gun_pivot_worldPosition.x, tank_gun_pivot_worldPosition.z);
            if (isNaN(angleY)) return;

            tank_turret_worldRotationY = app.get_parentRotationY(app.tankObject.gun_pivot);
            angleY -= tank_turret_worldRotationY;
            app.tankObject.gun_pivot.rotation.y = angleY;

            app.tankObject.gun.lookAt(app.playerObject.movingTarget_worldPosition);
            let angleX = app.tankObject.gun.rotation.x;
            angleX = Math.min(Math.max(angleX, -0.4), 0.06);
            app.tankObject.gun.rotation.set(angleX, 0, 0);
            if (angleX <= -0.4 || angleX >= 0.06) return;

            // fire rocket
            if (tank_turret_interval > turret_fireDelay) {
                tank_turret_interval = 0.0;
                app.shoot_rocket(app.enemyRocket_power * 2, app.tankObject.rocketLauncher, rocketLauncher_worldPosition);
            }
        }
    }

    app.fortress_turret_hit = function (damage, target) {
        app.fortress.health -= damage;
        app.addToScore(damage, target);
        if (app.fortress.health <= 0 && !tank_turret_destroyed) {
            tank_turret_destroyed = true;
            app.spawn_smallExplosion(500, 100, target.point, 0);
            app.objective_turrets_complete = true;
        }
    }

    return app;
}(MODULE));