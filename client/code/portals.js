(function (app) {

    app.init_portal = function () {
        var portal = app.get_boostPortal();
        app.boostPortal = {};
        app.boostPortal.asset = portal;
    }

    var portalVisible = false;

    var portalPosition2D = new THREE.Vector2(0, 0);
    var distance2destination = 99999;
    var distance2player = 99999;
    var boostDuration = 0;
    var boosting = false;

    var portalPassed = false;
    var portalTooFar = false;
    var big_gear_rotation = 0;
    var small_gear_rotation = 0;
    var glow_time = 0;

    app.update_portal = function () {
        distance2player = app.boostPortal.asset.object.position.distanceTo(app.playerObject.worldPosition);

        // check distance
        if (app.frameCount % 30 == 1) {
            if (app.level.mission == app.missionTypes.travel) {
                if (app.destination.worldPosition2D.length() > 0) {
                    check_portalDistance(app.destination);
                }
            } else if (app.level.mission == app.missionTypes.fortress) {
                if (app.fortress.worldPosition2D.length() > 0) {
                    check_portalDistance(app.fortress);
                }
            }
        }

        if (!portalVisible) return;

        // boost
        if (distance2player < 30 || boostDuration > 0) {
            if (!boosting) {
                boosting = true;
                boostDuration = 2;
            } else {
                boostDuration -= app.deltaTime;
            }
            app.boost_player(app.deltaTime * 6);
        } else {
            boosting = false;
            boostDuration = 0;
        }

        // look at player
        if (distance2player > 80 && !boosting) {
            app.boostPortal.asset.object.lookAt(app.playerObject.worldPosition);
        }

        // animate
        big_gear_rotation += app.deltaTime;
        app.boostPortal.asset.gear_big.rotation.z = big_gear_rotation;
        small_gear_rotation = big_gear_rotation * 9.666;
        for (let i = 0; i < app.boostPortal.asset.gears_small.children.length; i++) {
            app.boostPortal.asset.gears_small.children[i].rotation.z = small_gear_rotation;
        }

        glow_time += app.deltaTime;
        app.boostPortal.asset.glow_material.uniforms.time.value = glow_time;
    }

    app.reset_boost = function () {
        boosting = false;
        boostDuration = 0;
    }

    function check_portalDistance(object) {
        if (object.distance - distance2destination + 200 <= 0) {
            portalPassed = true;
        }
        if (distance2player > app.boostPortal_spawnDistance + 100) {
            portalTooFar = true;
        }
        if (portalPassed || portalTooFar) {
            portalPassed = false;
            portalTooFar = false;
            app.deactivate_portal();
            if (object.distance > 2000) app.spawn_portal();
        }
        distance2destination = Math.round(object.worldPosition2D.distanceTo(portalPosition2D));
    }

    var xDist;
    var yDist;
    var fractionOfTotal;
    var interval;

    app.spawn_portal = function () {
        portalVisible = true;
        glow_time = big_gear_rotation = 0;
        distance2destination = 99999;

        // spawn animation
        app.boostPortal.asset.object.scale.set(0.1, 0.1, 0.1);
        var scaleTimer = 0.1;
        clearInterval(interval);
        interval = setInterval(function () {
            scaleTimer += app.deltaTime_double;
            app.boostPortal.asset.object.scale.set(scaleTimer, scaleTimer, scaleTimer);
            if (scaleTimer >= 0.98) {
                app.boostPortal.asset.object.scale.set(1, 1, 1)
                clearInterval(interval);
            }
        }, 40);

        // position
        app.boostPortal.asset.object.visible = true;
        app.scene.add(app.boostPortal.asset.object);

        if (app.level.mission == app.missionTypes.travel) {
            xDist = app.destination.worldPosition2D.x - app.playerObject.worldPosition2D.x;
            yDist = app.destination.worldPosition2D.y - app.playerObject.worldPosition2D.y;
            fractionOfTotal = app.boostPortal_spawnDistance / app.destination.distance;
        } else if (app.level.mission == app.missionTypes.fortress) {
            xDist = app.fortress.worldPosition2D.x - app.playerObject.worldPosition2D.x;
            yDist = app.fortress.worldPosition2D.y - app.playerObject.worldPosition2D.y;
            fractionOfTotal = app.boostPortal_spawnDistance / app.fortress.distance;
        }
        portalPosition2D.x = app.playerObject.worldPosition2D.x + xDist * fractionOfTotal;
        portalPosition2D.y = app.playerObject.worldPosition2D.y + yDist * fractionOfTotal;

        app.boostPortal.asset.object.position.set(portalPosition2D.x, 300, portalPosition2D.y);
    }
    //debug
    /*
    setTimeout(function () {app.spawn_portal();}, 2000);
    */

    app.deactivate_portal = function () {
        portalVisible = false;
        app.boostPortal.asset.gear_big.rotation.z = 0;
        app.scene.remove(app.boostPortal.asset.object);
        app.boostPortal.asset.object.visible = false;
    }

    return app;
}(MODULE));