(function (app) {
    app.freeCamera = false;

    if (!app.debuggenzeit) {
        app.debugHUD.remove();
    }

        var renderInfo = {};
    if (app.debuggenzeit) renderInfo = app.renderer.info;

    const raycaster = new THREE.Raycaster();
    const hud_targetFrame = document.getElementById('targetFrame');
    const hud_crosshair = document.getElementById('crosshair');
    const totalScore_tag = document.getElementById('totalScore');

    var cameraClouds;
    var slow_frames = 0;

    // ======== START ========
    app.scene_init = function () {
        app.init_decals();

        // if (app.debuggenzeit) console.log('init scene');
        // load first view
        app.showView(1);
        app.initView();

        scene_setup();
        app.init_rockets();

        slow_frames = 0;
        app.showAd();
    }

    function scene_setup() {
        app.scene.add(app.turret_group);
        app.scene.add(app.rocket_group);
        app.scene.add(app.fighter_group);
        app.scene.add(app.mp_player_group);

        app.init_player();
        app.init_portal();

        if (app.isStressTest) stressTest(10);
        // if (app.debuggenzeit) console.log('scene set up');

        // ======== DEBUG OBJECTS ========
        if (app.debuggenzeit) {
            app.debugCubeObject.object.position.set(500, 0, 800);
        }

        // autoplay
        if (app.autoplay) {
            setTimeout(
                () => {
                    app.file_read(false, () => {
                        app.multiplayerMode = true;
                        app.load_level(app.level_mp_deathmatch, true);
                        app.gamePaused = false;
                        app.menu_close();
                        app.connect();
                    });
                }, 1000);
            setTimeout(
                function () {
                    app.level_ready = false;
                }, 3000);
        }

        // clouds
        cameraClouds = app.get_cameraClouds();
        app.playerObject.player.add(cameraClouds);

    }

    // ======== ANIMATE ========
    var terrainShift = new THREE.Vector2(0, 0);
    var cameraCloudShift = new THREE.Vector2(0, 0);
    var cameraCloudShift_offset = 0.0;
    var cameraCloudBias = 0.0;
    var cameraCloudBias_invert = false;
    var averageDeltaTime = 0.1;

    function animate() {
        requestAnimationFrame(animate);
        if (!app.gameRunning) return;
        if (!app.gamePaused) {
            app.frameCount++;
            if (app.frameCount > 1000) app.frameCount = 1;
            app.deltaTime = app.clock.getDelta();
            if (app.inMenu || app.gamePaused) {
                app.deltaTime *= 0.002;
            } else if (app.missionCompleted || app.playerKilled) {
                app.deltaTime *= 0.01;
            }
            if (app.debuggenzeit) {
                getFPS(app.deltaTime);
            }

            // check performance
            if (app.frameCount % 30 == 0) {
                adaptQuality();
            }

            app.deltaTime = Math.min(app.deltaTime, 0.1); // avoid extreme acceleration during frame drops
            if (app.doubleSpeed) app.deltaTime *= 2;
            // accumulate 20 frames
            averageDeltaTime = (averageDeltaTime * 19 + app.deltaTime) * 0.05;
            app.deltaTime_half = app.deltaTime * 0.5;
            app.deltaTime_double = app.deltaTime * 2.0;
            app.deltaTime_triple = app.deltaTime * 3.0;



            if (app.isStressTest) {
                for (let i = 0; i < stress_clones.length; i++) {
                    stress_clones[i].rotation.y += app.deltaTime * (i + 1);
                }
            }

            app.update_player();

            // environment
            if (app.terrainVisible) {
                app.terrainObject.object.position.set(app.playerObject.worldPosition.x, -app.terrainHeight, app.playerObject.worldPosition.z);
                app.terrainObject.object.rotation.y = app.playerObject.player.rotation.y + app.pi * app.reverseView;
                terrainShift.set(-app.playerObject.worldPosition.x * app.terrain_scale, app.playerObject.worldPosition.z * app.terrain_scale);
                app.terrainObject.material.uniforms.shift.value = terrainShift;
                if (app.frameCount % app.decal_refreshRate == 0 && app.shadowDecals_on) {
                    app.terrainObject.material.uniforms.decalMap_scale.value = app.decalMap_scale;
                    app.terrainObject.material.uniforms.worldRotation.value = -app.terrainObject.object.rotation.y;
                }
            }

            // camera clouds
            if (app.cloudsVisible && !app.playerInsideTunnel) {
                cameraClouds.position.z = (app.reverseView) ? 40 : -40;
                cameraClouds.material.visible = true;

                // oscilate haze
                if (!cameraCloudBias_invert) {
                    cameraCloudBias += app.playerObject.speed * app.deltaTime * 0.004;
                    if (cameraCloudBias > 0.8) {
                        cameraCloudBias_invert = true;
                        cameraCloudShift_offset += 0.1; // shift uv when clouds disappear
                    }
                } else {
                    cameraCloudBias -= app.playerObject.speed * app.deltaTime * 0.002;
                    if (cameraCloudBias < 0.2) {
                        cameraCloudBias_invert = false;
                    }
                }
                cameraClouds.material.uniforms.bias.value = cameraCloudBias;

                cameraCloudShift.x = -app.playerObject.player.rotation.y * 0.2 + cameraCloudShift_offset;
                cameraCloudShift.y = app.playerObject.worldPosition.y * -0.002;
                cameraClouds.material.uniforms.shift.value = cameraCloudShift;
                cameraClouds.material.uniforms.opacity.value = Math.max(Math.min((app.playerObject.worldPosition.y - 100) * 0.003, 0.2), 0);
            } else {
                cameraClouds.material.visible = false;
            }

            if (app.level.turrets) app.update_turrets();
            if (app.level.mission == app.missionTypes.fortress) app.update_fortress();
            if (app.level.mission == app.missionTypes.boss) app.update_boss();
            if (app.level.mission == app.missionTypes.travel || app.level.mission == app.missionTypes.race) app.update_destination();
            if ((app.level.mission == app.missionTypes.travel
                || app.level.mission == app.missionTypes.fortress)
                && !app.benchmarkMode
                && app.level.stageIndex != app.stages.space) app.update_portal();
            if (app.level.mission == app.missionTypes.survival || app.level.mission == app.missionTypes.race) app.update_objectiveTimer();
            if (app.level.fighters) app.update_fighters();
            if (app.level.mission == app.missionTypes.race && app.level.stageIndex == app.stages.space) app.update_asteroids();
            if (!app.benchmarkMode && !app.multiplayerMode) app.updateObjectives();

            if (app.multiplayerMode) {
                if (app.frameCount % app.mp_refreshRate == 0) app.send_mp_update();
                app.update_playerRockets();
                app.animate_onlinePlayers();
                app.update_mp_rockets();
            } else {
                for (let i = 0; i < app.collisionIterations; i++) {
                    app.update_playerRockets();
                    app.update_enemyRockets();
                }
            }

            // lock target
            if (app.frameCount % 2 == 0) {
                if (app.lockOnTarget.hitObject) {
                    hud_crosshair.style.display = 'none';
                    hud_targetFrame.style.display = 'block';
                    update_targetFrame(app.lockOnTarget.hitObject);
                } else if (app.playerObject.crosshairObject != null) {
                    hud_crosshair.style.display = 'block';
                    hud_targetFrame.style.display = 'none';
                    update_targetFrame();
                } else {
                    hud_crosshair.style.display = 'none';
                    hud_targetFrame.style.display = 'none';
                }
            }

            if (app.shadowDecals_on && app.level.stageIndex != app.stages.space) {
                app.update_decalCanvas();
            }

            // hud
            app.update_hud();

            // audio
            if (app.soundfx_on) app.update_audio();

            if (app.debuggenzeit) update_debugCube();

            if (app.frameCount % app.decal_refreshRate == 0 && app.shadowDecals_on && app.level.stageIndex != app.stages.space) {
                app.renderer.setRenderTarget(app.shadowFBO);
                app.renderer.render(app.shadowScene, app.shadowCamera);
                app.renderer.setRenderTarget(null);
            }
            app.orientation_changed = false;
        }
        app.renderer.render(app.scene, app.camera);
    }
    animate();

    function adaptQuality() {
        if (app.benchmarkMode) {
            app.hud_refreshRate = 2;
            app.radar_refreshRate = 30;
            app.decal_refreshRate = 2;
            return;
        }
        if (averageDeltaTime > 0.066) {
            // below 15fps
            app.hud_refreshRate = 8;
            app.radar_refreshRate = 40;
            app.decal_refreshRate = 6;
        } else if (averageDeltaTime > 0.05) {
            // below 20fps
            app.hud_refreshRate = 4;
            app.radar_refreshRate = 40;
            app.decal_refreshRate = 4;
        } else if (averageDeltaTime > 0.04) {
            // below 25fps
            app.hud_refreshRate = 2;
            app.radar_refreshRate = 30;
            app.decal_refreshRate = 2;
        } else if (averageDeltaTime > 0.033) {
            // below 30fps
            app.hud_refreshRate = 2;
            app.radar_refreshRate = 30;
            app.decal_refreshRate = 2;
        } else {
            app.hud_refreshRate = 2;
            app.radar_refreshRate = 30;
            app.decal_refreshRate = 2;
        }
    }

    // ======== RAYCAST ========
    var terrain_intersects;
    var terrain_uv;
    var terrain_properties;
    var terrain_hitPoint;

    app.raycast2terrain = function (origin, direction) {
        raycaster.set(origin, direction);
        terrain_intersects = raycaster.intersectObject(app.terrainObject.rayMesh, false);
        if (terrain_intersects.length > 0) {
            for (let i = 0; i < terrain_intersects.length; i++) {
                terrain_uv = terrain_intersects[i].uv;
                terrain_properties = get_terrain_properties(terrain_uv);
                terrain_hitPoint = new THREE.Vector3(terrain_intersects[i].point.x, terrain_properties.height, terrain_intersects[i].point.z);
                return { position: terrain_hitPoint, color: terrain_properties.color };
            }
        }
    }

    var object_intersects;

    app.raycast2object = function (origin, direction) {
        if (app.raycastTargets.length == 0) return;
        raycaster.set(origin, direction);
        object_intersects = raycaster.intersectObjects(app.raycastTargets, false);
        if (object_intersects.length > 0) {
            for (let i = 0; i < object_intersects.length; i++) {
                if (object_intersects[i].distance < app.maxRaycastDistance) {
                    return { object: object_intersects[i].object, point: object_intersects[i].point, distance: object_intersects[i].distance, face: object_intersects[i].face };
                }
            }
        }
    }

    var terrain_transformedUV;
    var terrain_pixelCoord = [0, 0];
    var terrain_pixel = [0, 0, 0];
    var terrainHeight;

    function get_terrain_properties(uv) {
        terrain_transformedUV = transform_UVs(uv, terrainShift, -app.terrainObject.object.rotation.y);
        if (app.terrainObject.heightMap.image) {
            terrain_pixelCoord = [terrain_transformedUV.x * app.terrainObject.heightMap.image.width, (1 - terrain_transformedUV.y) * app.terrainObject.heightMap.image.height];
            //if (app.debuggenzeit) console.log('terrain_pixelCoord ',terrain_pixelCoord);
            terrain_pixel = app.terrainObject.heightMapData.getImageData(terrain_pixelCoord[0], terrain_pixelCoord[1], 1, 1).data;
        }
        terrainHeight = -app.terrainHeight + (terrain_pixel[0] / 255) * app.terrainHeight; // read red channel and multiply by terrain height
        //if (app.debuggenzeit) console.log('terrain height ',terrainHeight);
        return { height: terrainHeight, color: terrain_pixel };
    }

    var rotatedUV;

    function transform_UVs(uv, shift, rotation) {
        rotatedUV = new THREE.Vector2(uv.x - 0.5, uv.y - 0.5); //move rotation center to center of object
        rotatedUV = app.rotate2d(rotation, rotatedUV);
        rotatedUV.add(shift); // movement uv shift
        rotatedUV.add(new THREE.Vector2(0.5, 0.5)); // move uv back to origin
        rotatedUV.x = (rotatedUV.x > 0) ? rotatedUV.x % 1 : 1 + rotatedUV.x % 1;
        rotatedUV.y = (rotatedUV.y > 0) ? rotatedUV.y % 1 : 1 + rotatedUV.y % 1;

        return rotatedUV;
    }

    var framePosition;

    function update_targetFrame(target) {
        if (target) {
            framePosition = target.worldPosition.clone();
            app.playerObject.crosshairObject = null;
        } else {
            if (app.playerObject.crosshairObject != null) {
                framePosition = app.playerObject.crosshairObject.point.clone();
            }
        }
        framePosition.project(app.camera);
        if (app.landscapeOrientation) {
            framePosition.x = (framePosition.x * app.screenWidthHalf) + app.screenWidthHalf + 16;
            framePosition.y = - (framePosition.y * app.screenHeightHalf) + app.screenHeightHalf - 62;
        } else {
            framePosition.x = (framePosition.x * app.screenWidthHalf) + app.screenWidthHalf - 24;
            framePosition.y = - (framePosition.y * app.screenHeightHalf) + app.screenHeightHalf + 14;
        }
        if (target) {
            hud_targetFrame.style.left = (framePosition.x) + 'px';
            hud_targetFrame.style.top = (framePosition.y) + 'px';
        } else {
            hud_crosshair.style.left = (framePosition.x) + 'px';
            hud_crosshair.style.top = (framePosition.y) + 'px';
        }
    }

    app.refresh_totalScore = function () {
        app.totalScore = 0;
        for (let i = 0; i < app.levelScores.length; i++) {
            app.totalScore += app.levelScores[i];
        }

        totalScore_tag.innerHTML = "Total Score: " + app.totalScore;
    }

    app.hashCode = function (s) {
        return s.split("").reduce(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    }

    // ======== STRESS ========
    var stress_clones = [];
    function stressTest(clones) {
        for (let i = 0; i < clones; i++) {
            var clone = app.tunaObject.ship.clone();
            clone.position.y = i * 2;
            app.scene.add(clone);
            stress_clones.push(clone);
        }
    }

    function update_debugCube() {
        app.debugCubeObject.radarPosition.set(app.debugCubeObject.object.position.x, app.debugCubeObject.object.position.z);
        app.debugCubeObject.radarPosition.rotateAround(app.playerObject.worldPosition2D, app.playerObject.player.rotation.y);
        app.debugCubeObject.object.rotation.y += app.deltaTime * 0.1;
        if (app.frameCount % app.decal_refreshRate == 0 && app.shadowDecals_on) {
            app.debugCubeObject.material.uniforms.decalMap_scale.value = app.decalMap_scale;
            app.debugCubeObject.material.uniforms.origin.value = app.playerObject.worldPosition2D;
            app.debugCubeObject.material.uniforms.worldRotation.value = app.playerObject.player.rotation.y;
        }
    }

    // ======== FPS ========
    var time = 0.0;

    function getFPS(deltaTime) {
        (app.frameCount == 1) ? time = app.deltaTime : time += app.deltaTime;
        app.debugHUD.innerHTML = "fps: " + (1.0 / (time / app.frameCount)).toFixed(1) + "<br/>";

        if (app.deltaTime > 0.08) slow_frames++;
        app.debugHUD.innerHTML += "slow frames: " + slow_frames + "<br/>";

        let activeTurrets = 0;
        for (let i = 0; i < app.turret_pool.length; i++) {
            if (!app.turret_pool[i].isFree) activeTurrets++;
        }
        app.debugHUD.innerHTML += "turrets: " + activeTurrets + "<br/>";

        let activeFighters = 0;
        for (let i = 0; i < app.fighter_pool.length; i++) {
            if (!app.fighter_pool[i].isFree) activeFighters++;
        }
        app.debugHUD.innerHTML += "fighters: " + activeFighters + "<br/>";

        let activeEnemyRockets = 0;
        for (let i = 0; i < app.enemyRocket_pool.length; i++) {
            if (!app.enemyRocket_pool[i].isFree) activeEnemyRockets++;
        }
        app.debugHUD.innerHTML += "enemyRockets: " + activeEnemyRockets + "<br/>";

        let activePlayerRockets = 0;
        for (let i = 0; i < app.playerRocket_pool.length; i++) {
            if (!app.playerRocket_pool[i].isFree) activePlayerRockets++;
        }
        app.debugHUD.innerHTML += "playerRockets: " + activePlayerRockets + "<br/>";
        app.debugHUD.innerHTML += "damage: " + app.playerObject.damage + "<br/>";

        app.debugHUD.innerHTML += "render geo: " + renderInfo.memory.geometries + "<br/>";
        app.debugHUD.innerHTML += "render tex: " + renderInfo.memory.textures + "<br/>";
        app.debugHUD.innerHTML += "render tris: " + renderInfo.render.triangles + "<br/>";

        app.debugHUD.innerHTML += "bat level: " + app.batteryLevel + "<br/>";
        app.debugHUD.innerHTML += "bat temp: " + app.batteryTemperature + "<br/>";
    }

    return app;
}(MODULE));