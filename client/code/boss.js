(function (app) {

    var lindworm_health = 800;
    var orb_health = 800;
    var rocketInterval;
    var doorInterval;

    app.init_boss = function () {
        if (app.boss != null) app.deactivate_boss();

        app.spawn_boss();
    }

    var worldPosition = new THREE.Vector3();
    var worldPosition2D = new THREE.Vector2(0, 0);
    var radarPosition = new THREE.Vector2(0, 0);
    var bossType;

    app.spawn_boss = function () {
        if (app.boss == null) {
            app.boss = {
                health: 0.0,
                distance: 0.0,
                angleToPlayer: 0.0,
                worldPosition: worldPosition
            };

        }

        switch (app.level.stageIndex) {
            case app.stages.desert:
                app.boss.health = lindworm_health;
                bossType = app.bossTypes.lindworm;
                app.lindwormObject = app.get_lindworm();
                app.boss.asset = app.lindwormObject;
                app.boss.asset.object.position.set(9999, -100, 9999);
                break;
            case app.stages.space:
                app.boss.health = orb_health;
                bossType = app.bossTypes.orb;
                app.orbObject = app.get_orb();
                app.boss.asset = app.orbObject;
                app.boss.asset.object.position.copy(app.level.destinationPosition);
                break;
        }

        app.boss.worldPosition2D = worldPosition2D;
        app.boss.radarPosition = radarPosition;
        Object.seal(app.boss);

        switch (bossType) {
            case app.bossTypes.lindworm:
                app.deactivate_boss();
                break;
            case app.bossTypes.orb:
                player_ambient_color_v3.fromArray(app.playerObject.asset.material.uniforms.ambientLightColor.value);
                activate_boss();
                place_guns();
                break;
        }
    }

    function activate_boss() {
        app.scene.add(app.boss.asset.object);
        app.boss.asset.object.visible = true;
    }

    app.deactivate_boss = function () {
        if (app.debuggenzeit) console.log('deactivate_boss');
        clearInterval(rocketInterval);
        rocketInterval_started = false;
        app.scene.remove(app.boss.asset.object);
        app.boss.asset.object.visible = false;
    }

    function activate_lindworm() {
        app.boss.asset.object.position.set(app.playerObject.worldPosition.x, 0, app.playerObject.worldPosition.z);
        activate_boss();
    }

    app.reset_boss = function () {
        clearInterval(rocketInterval);
        rocketInterval_started = false;

        if (app.level.mission != app.missionTypes.boss) return;


        switch (app.level.stageIndex) {
            case app.stages.desert:
                if (app.boss != null) app.boss.health = lindworm_health;
                if (app.lindwormObject != null) {
                    app.lindwormObject.material.uniforms.explosion_progress.value = 0;
                    app.lindwormObject.material.uniforms.explosion_progress.value = 0;
                    app.lindwormObject.material.uniforms.diffuse.value = app.color_white;
                    app.lindwormObject.sandMaterial.uniforms.explosion_progress.value = 0;
                    app.lindwormObject.sandMaterial.uniforms.explosion_progress.value = 0;
                    app.lindwormObject.sandMaterial.uniforms.diffuse.value = app.color_sand;
                }
                boss_vanished = true;
                lind_roation = 0;
                if (moveTimeout != null) clearTimeout(moveTimeout);
                app.deactivate_boss();
                setTimeout(move_boss, 6000);
                break;
            case app.stages.space:
                if (app.boss != null) app.boss.health = orb_health;
                if (app.orbObject != null) {
                    clearInterval(doorInterval);
                    orb_door_angle = 0;
                    for (let i = 0; i < app.orbObject.doors.length; i++) {
                        app.orbObject.doors[i].children[0].rotation.x = 0;
                    }
                    activate_boss();
                    place_guns();
                }
                break;
        }
        slowdown = false;
        speed = 1;

        if (destruction_interval != null) clearInterval(destruction_interval);
        switch (bossType) {
            case app.bossTypes.lindworm:
                app.raycastTargets.push(app.boss.asset.rayMesh);
                break;
            case app.bossTypes.orb:
                app.raycastTargets.push(app.boss.asset.rayMesh);
                app.raycastTargets.push(app.boss.asset.crystal_rayMesh);
                for (let i = 0; i < app.orbObject.guns.length; i++) {
                    app.raycastTargets.push(app.orbObject.guns[i].rayMesh);
                }
                for (let i = 0; i < app.orbObject.doors.length; i++) {
                    app.raycastTargets.push(app.orbObject.doors[i].children[0].children[0]);
                }
                break;
        }
    }


    app.update_bossHealth = function () {
        return (app.boss.health <= 0) ? true : false;
    }

    app.update_boss = function () {
        app.boss.distance = Math.round(app.boss.asset.object.position.distanceTo(app.playerObject.worldPosition));
        app.boss.worldPosition = app.boss.asset.object.position;
        app.boss.angleToPlayer = app.angleToPoint2D(app.playerObject.worldPosition.x, app.playerObject.worldPosition.z, app.boss.worldPosition.x, app.boss.worldPosition.z);

        switch (bossType) {
            case app.bossTypes.lindworm:
                animate_lindworm();
                break;
            case app.bossTypes.orb:
                animate_orb();
                break;
        }

        if (app.frameCount % app.decal_refreshRate == 0) {
            app.boss.worldPosition2D.set(app.boss.asset.object.position.x, app.boss.asset.object.position.z);
            app.boss.radarPosition.copy(app.boss.worldPosition2D);
            app.boss.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y); // rotate target around world rotation
            app.boss.radarPosition.sub(app.playerObject.worldPosition2D);
        }

    }

    app.boss_hit = function (damage, target) {
        app.boss.health -= damage;
        app.addToScore(damage, target);
        if (app.boss.health <= 0) {
            slowdown = true;
            app.spawn_smallExplosion(500, 100, target.point, 0);
            app.destroy_boss();
        }
    }

    app.boss_gun_hit = function (damage, target) {
        let gun_index = parseInt(target.object.parent.name);
        let gun = app.orbObject.guns[gun_index];
        gun.health -= damage;
        app.addToScore(damage, target);

        if (gun.health <= 0) {
            gun.parent.remove(gun.mesh);
            gun.active = false;
            app.raycastTargets.splice(app.raycastTargets.indexOf(target.object), 1);
            app.playerObject.crosshairObject = null;
            app.spawn_smallExplosion(300, 100, target.point, 0);
        }

        count_guns();
    }

    var orb_gun_count = 0;
    var orb_door_angle = 0;

    function count_guns() {
        orb_gun_count = 0;

        for (let i = 0; i < app.orbObject.guns.length; i++) {
            if (app.orbObject.guns[i].active == true) orb_gun_count++;
        }
        if (orb_gun_count <= 0) {
            // if (app.debuggenzeit) console.log('all guns destroyed');

            // open doors
            doorInterval = setInterval(function () {
                orb_door_angle -= 0.002;
                if (orb_door_angle < -1) {
                    clearInterval(doorInterval); return;
                }
                for (let i = 0; i < app.orbObject.doors.length; i++) {
                    app.orbObject.doors[i].children[0].rotation.x = orb_door_angle;
                }
            }, 30);

        }
    }

    function place_guns() {
        for (let i = 0; i < app.orbObject.guns.length; i++) {
            app.orbObject.guns[i].active = true;
            app.orbObject.guns[i].parent.add(app.orbObject.guns[i].mesh);
        }
    }

    var destruction_interval = null;

    app.destroy_boss = function () {
        destruction_interval = setInterval(function () {
            if (app.lindwormObject == null) {
                clearInterval(destruction_interval);
                return;
            }
            app.lindwormObject.material.uniforms.explosion_progress.value += app.deltaTime * 5;
            app.lindwormObject.sandMaterial.uniforms.explosion_progress.value += app.deltaTime * 5;
            app.lindwormObject.material.uniforms.diffuse.value = app.color_orange;
            app.lindwormObject.sandMaterial.uniforms.diffuse.value = app.color_orange;

        }, 40);
    }

    var boss_vanished = true;
    var lind_roation = 0;
    var wiggle_timer = 0;
    var speed = 1;
    var slowdown = false;
    var rocketLauncher_worldPosition = new THREE.Vector3();
    var rocket_index = 0;
    var rocket_counter = 0;
    var rocketInterval_started = false;

    var player_ambient_color_v3 = new THREE.Vector3(0, 0, 0);
    var player_target_color_v3 = new THREE.Vector3(0.8, 0.7, 1);
    var player_current_color_v3 = new THREE.Vector3(0, 0, 0);
    var player_current_color_array = [];

    function animate_orb() {
        // animate ambient light
        if (app.boss.distance < 200) {
            let distance = 1 - Math.min(1, Math.max(0, (app.boss.distance - 100) * 0.01));

            player_current_color_v3.lerpVectors(player_ambient_color_v3, player_target_color_v3, distance);
            player_current_color_v3.toArray(player_current_color_array);
            app.playerObject.asset.material.uniforms.ambientLightColor.value = player_current_color_array;
        }

        app.orbObject.object.rotation.z += app.deltaTime * 0.05;

        if (app.boss.distance < 2000) {
            // fire rocket
            if (!rocketInterval_started && !app.inMenu) {
                rocketInterval_started = true;
                rocketInterval = setInterval(function () {
                    rocket_counter++;
                    rocket_index = rocket_counter % app.orbObject.guns.length;
                    if (app.orbObject.guns[rocket_index].active) {
                        app.orbObject.guns[rocket_index].mesh.getWorldPosition(rocketLauncher_worldPosition);
                        app.shoot_rocket(app.enemyRocket_power * 3, app.orbObject.guns[rocket_index].mesh, rocketLauncher_worldPosition);
                    }
                }, 500);
            }
        } else {
            clearInterval(rocketInterval);
            rocketInterval_started = false;
        }
    }

    function animate_lindworm() {
        if (boss_vanished) return;
        if (slowdown) speed -= app.deltaTime * 0.1;

        lind_roation += app.deltaTime * 0.8 * speed;
        wiggle_timer = lind_roation / 6.3;

        app.lindwormObject.material.uniforms.rotation_progress.value = wiggle_timer;
        app.lindwormObject.sandMaterial.uniforms.rotation_progress.value = wiggle_timer;

        app.lindwormObject.sandMaterial.uniforms.shift_time.value = wiggle_timer;
        if (app.shadowDecals_on) app.update_lindwormDecal(wiggle_timer);

        if (lind_roation > 6.3) {
            boss_vanished = true;
            lind_roation = 0;
            wiggle_timer = 0;
            app.lindwormObject.pivot.rotation.x = 1.08;
            app.lindwormObject.drill.rotation.z = 0;
            app.deactivate_boss();
            move_boss();
        }

        app.lindwormObject.pivot.rotation.x = lind_roation + 1.08;
        app.lindwormObject.drill.rotation.z += app.deltaTime * 5;

        // fire rocket
        if (lind_roation > 5.2) {
            if (rocketInterval_started) return;
            rocketInterval_started = true;
            rocketInterval = setInterval(function () {
                if (rocket_counter >= 5) {
                    clearInterval(rocketInterval);
                    return;
                }
                rocket_counter++;
                rocket_index = rocket_counter % app.lindwormObject.rocketLaunchers.children.length;
                app.lindwormObject.rocketLaunchers.lookAt(app.playerObject.movingTarget_worldPosition);
                app.lindwormObject.rocketLaunchers.getWorldPosition(rocketLauncher_worldPosition);
                app.shoot_rocket(app.enemyRocket_power, app.lindwormObject.rocketLaunchers.children[rocket_index], rocketLauncher_worldPosition);
            }, 200);
        }
    }

    var moveTimeout = null;
    var randomPosition = new THREE.Vector3();
    var randomRotation;

    function move_boss() {
        moveTimeout = setTimeout(function () {
            boss_vanished = false;
            rocketInterval_started = false;
            rocket_counter = 0;
            activate_lindworm();
            randomRotation = THREE.Math.randInt(-31, 31);
            randomPosition.set(app.playerObject.worldPosition.x, 0, app.playerObject.worldPosition.z);
            randomPosition.addScaledVector(app.movingDirection, -600);

            app.lindwormObject.object.rotation.y = app.playerObject.player.rotation.y + randomRotation * 0.1;
            app.lindwormObject.object.position.set(randomPosition.x, -100, randomPosition.z);
        }, 1000);
    }

    return app;
}(MODULE));