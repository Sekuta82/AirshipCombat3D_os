(function (app) {

    const roate90 = 1.5708;
    var frustum = app.terrain_scaleFactor * 50;
    app.shadowCamera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0, 200);
    app.shadowCamera.position.set(0, 100, frustum);
    app.shadowCamera.rotation.set(-roate90, 0, app.pi);
    app.shadowScene.add(app.shadowCamera);
    app.shadowScene.background = app.color_black;

    if (app.debuggenzeit) {
        var FBO_material = app.get_particleMaterial();
        var FBO_plane = new THREE.PlaneBufferGeometry(1, 1);
        var FBO_debug_mesh = new THREE.Mesh(FBO_plane, FBO_material);
    }

    app.shadowFBO = new THREE.WebGLRenderTarget(app.renderingWidth, app.renderingHeight, {
        generateMipmaps: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false,
    });

    // player
    var player_shadow_decal_material = app.get_decalMaterial();
    var player_shadow_decal_plane = new THREE.PlaneBufferGeometry(50, 50);
    var player_decal_texture = new THREE.TextureLoader().load('assets/decals/tuna_decal.png', function () {
        player_shadow_decal_material.uniforms.colorMap.value = player_decal_texture;
        player_shadow_decal_material.uniforms.diffuse.value = app.color_red;
    });
    var player_shadow_decal = new THREE.Mesh(player_shadow_decal_plane, player_shadow_decal_material);
    player_shadow_decal.position.z = 50;
    player_shadow_decal.rotation.set(-roate90, 0, app.pi);

    // platform
    var platform_shadow_decal_material = app.get_decalMaterial();
    var platform_shadow_decal_plane = new THREE.PlaneBufferGeometry(250, 250);
    var platform_decal_texture = new THREE.TextureLoader().load('assets/decals/platform_decal.png', function () {
        platform_shadow_decal_material.uniforms.colorMap.value = platform_decal_texture;
        platform_shadow_decal_material.uniforms.diffuse.value = app.color_green;
    });
    var platform_shadow_decal = new THREE.Mesh(platform_shadow_decal_plane, platform_shadow_decal_material);
    platform_shadow_decal.rotation.x = -roate90;

    // skyland
    var skyland_shadow_decal_material = app.get_decalMaterial();
    var skyland_shadow_decal_plane = new THREE.PlaneBufferGeometry(1400, 1400);
    var skyland_decal_texture = new THREE.TextureLoader().load('assets/decals/skyland_decal.png', function () {
        skyland_shadow_decal_material.uniforms.colorMap.value = skyland_decal_texture;
        skyland_shadow_decal_material.uniforms.diffuse.value = app.color_green;
    });
    var skyland_shadow_decal = new THREE.Mesh(skyland_shadow_decal_plane, skyland_shadow_decal_material);
    skyland_shadow_decal.rotation.x = -roate90;

    // tank
    var tank_shadow_decal_material = app.get_decalMaterial();
    var tank_shadow_decal_plane = new THREE.PlaneBufferGeometry(600, 600);
    var tank_decal_texture = new THREE.TextureLoader().load('assets/decals/tank_decal.png', function () {
        tank_shadow_decal_material.uniforms.colorMap.value = tank_decal_texture;
        tank_shadow_decal_material.uniforms.diffuse.value = app.color_green;
    });
    var tank_shadow_decal = new THREE.Mesh(tank_shadow_decal_plane, tank_shadow_decal_material);
    tank_shadow_decal.rotation.x = -roate90;

    // lindworm
    var lindworm_shadow_decal_material = app.get_lindwormDecalMaterial();
    var lindworm_shadow_decal_plane = new THREE.PlaneBufferGeometry(650, 1300);
    var lindworm_decal_texture = new THREE.TextureLoader().load('assets/decals/lindworm_decal.png', function () {
        lindworm_shadow_decal_material.uniforms.colorMap.value = lindworm_decal_texture;
        lindworm_shadow_decal_material.uniforms.diffuse.value = app.color_green;
    });
    var lindworm_shadow_decal = new THREE.Mesh(lindworm_shadow_decal_plane, lindworm_shadow_decal_material);
    lindworm_shadow_decal.rotation.x = -roate90;

    // fortress tunnel
    var skyland_tunnel_shadow_decal_material = app.get_decalMaterial();
    var skyland_tunnel_shadow_decal_plane = new THREE.PlaneBufferGeometry(1400, 1400);
    var skyland_tunnel_decal_texture = new THREE.TextureLoader().load('assets/decals/skyland_tunnel_decal.png', function () {
        skyland_tunnel_shadow_decal_material.uniforms.colorMap.value = skyland_tunnel_decal_texture;
        skyland_tunnel_shadow_decal_material.uniforms.diffuse.value = app.color_blue;
    });
    var skyland_tunnel_shadow_decal = new THREE.Mesh(skyland_tunnel_shadow_decal_plane, skyland_tunnel_shadow_decal_material);
    skyland_tunnel_shadow_decal.rotation.x = -roate90;

    // ======================================================
    // shadow decals
    app.decalMap_scale = 3.0;

    app.init_decals = function () {
        app.shadowScene.add(player_shadow_decal);
        app.shadowScene.add(platform_shadow_decal);
        app.shadowScene.add(skyland_shadow_decal);
        app.shadowScene.add(tank_shadow_decal);
        app.shadowScene.add(skyland_tunnel_shadow_decal);
        app.shadowScene.add(lindworm_shadow_decal);

        if (app.debuggenzeit) {
            FBO_material.uniforms.colorMap.value = app.shadowFBO.texture;
            app.camera.add(FBO_debug_mesh);
            FBO_debug_mesh.position.x = 1;
            FBO_debug_mesh.position.y = 0;
            FBO_debug_mesh.position.z = -1.5;
        }
    }

    var player_scaleOffset = 0.0;
    var player_previousDistanceToGround = 0.0;

    var skyland_tunnel_front_position = new THREE.Vector3();
    var skyland_tunnel_rear_position = new THREE.Vector3();
    var skyland_tunnel_front_distance = 0.0;
    var skyland_tunnel_rear_distance = 0.0;
    var skyland_tunnel_verticalBounds = [60, 70];

    app.update_decalCanvas = function () {
        if (app.frameCount % app.decal_refreshRate == 0) {
            // scale map based on flight height
            if (app.level.stageIndex != app.stages.space) {
                app.decalMap_scale = 2.5 - app.playerObject.distanceToTerrain * 0.003;
            } else {
                app.decalMap_scale = 2;
            }

            // player
            // delay scaling when passing an object
            player_previousDistanceToGround = THREE.Math.lerp(player_previousDistanceToGround, app.playerObject.distanceToGround, app.deltaTime);
            player_scaleOffset = app.playerObject.distanceToTerrain - player_previousDistanceToGround;

            var decalMap_player_scale = 2.5 - (app.playerObject.distanceToTerrain - player_scaleOffset) * 0.003;
            player_shadow_decal.scale.set(decalMap_player_scale, decalMap_player_scale, decalMap_player_scale);

            // platform
            if ((app.level.stageIndex == app.stages.grasslands || app.level.stageIndex == app.stages.desert) && app.level.mission == app.missionTypes.travel) {
                platform_shadow_decal.material.visible = true;

                platform_shadow_decal.position.set(app.destination.radarPosition.x * app.decalMap_scale, 0, app.destination.radarPosition.y * app.decalMap_scale);
                platform_shadow_decal.rotation.z = app.pi + app.destination.asset.object.rotation.y - app.playerObject.player.rotation.y;
                platform_shadow_decal.scale.set(app.decalMap_scale, app.decalMap_scale, app.decalMap_scale);
            } else {
                platform_shadow_decal.material.visible = false;
            }

            // lindworm
            if (app.level.mission == app.missionTypes.boss) {
                lindworm_shadow_decal.material.visible = true;

                lindworm_shadow_decal.position.set(app.boss.radarPosition.x * app.decalMap_scale, 0, app.boss.radarPosition.y * app.decalMap_scale);
                lindworm_shadow_decal.rotation.z = app.pi + app.boss.asset.object.rotation.y - app.playerObject.player.rotation.y;
                lindworm_shadow_decal.scale.set(app.decalMap_scale, app.decalMap_scale, app.decalMap_scale);
            } else {
                lindworm_shadow_decal.material.visible = false;
            }

            // fortress
            if (app.level.mission == app.missionTypes.fortress) {
                switch (app.level.stageIndex) {
                    case app.stages.grasslands:
                        skyland_shadow_decal.material.visible = true;
                        tank_shadow_decal.material.visible = false;

                        // tunnel triggers
                        if (app.fortress.asset.object.position.y + skyland_tunnel_verticalBounds[0] > app.playerObject.worldPosition.y && app.fortress.asset.object.position.y - skyland_tunnel_verticalBounds[1] < app.playerObject.worldPosition.y) {
                            app.fortress.asset.triggers.tunnel_front.getWorldPosition(skyland_tunnel_front_position);
                            app.fortress.asset.triggers.tunnel_rear.getWorldPosition(skyland_tunnel_rear_position);
                            skyland_tunnel_front_distance = Math.round(skyland_tunnel_front_position.distanceTo(app.playerObject.worldPosition));
                            skyland_tunnel_rear_distance = Math.round(skyland_tunnel_rear_position.distanceTo(app.playerObject.worldPosition));
                            if (skyland_tunnel_front_distance < app.fortress.tunnel_trigger_distance && skyland_tunnel_rear_distance < app.fortress.tunnel_trigger_distance) {
                                app.playerInsideTunnel = true;
                            } else {
                                app.playerInsideTunnel = false;
                            }
                        } else {
                            app.playerInsideTunnel = false;
                        }

                        skyland_shadow_decal.position.set(app.fortress.radarPosition.x * app.decalMap_scale, 0, app.fortress.radarPosition.y * app.decalMap_scale);
                        skyland_shadow_decal.rotation.z = app.pi + app.fortress.asset.object.rotation.y - app.playerObject.player.rotation.y;
                        skyland_shadow_decal.scale.set(app.decalMap_scale, app.decalMap_scale, app.decalMap_scale);

                        if (app.playerInsideTunnel) {
                            skyland_tunnel_shadow_decal.material.visible = true;
                            skyland_tunnel_shadow_decal.position.set(app.fortress.radarPosition.x * app.decalMap_scale, 0, app.fortress.radarPosition.y * app.decalMap_scale);
                            skyland_tunnel_shadow_decal.rotation.z = app.pi + app.fortress.asset.object.rotation.y - app.playerObject.player.rotation.y;
                            skyland_tunnel_shadow_decal.scale.set(app.decalMap_scale, app.decalMap_scale, app.decalMap_scale);
                        } else {
                            skyland_tunnel_shadow_decal.material.visible = false;
                        }
                        break;
                    case app.stages.lava:
                        tank_shadow_decal.material.visible = true;
                        skyland_shadow_decal.material.visible = false;
                        skyland_tunnel_shadow_decal.material.visible = false;

                        tank_shadow_decal.position.set(app.fortress.radarPosition.x * app.decalMap_scale, 0, app.fortress.radarPosition.y * app.decalMap_scale);
                        tank_shadow_decal.rotation.z = app.pi + app.fortress.asset.object.rotation.y - app.playerObject.player.rotation.y;
                        tank_shadow_decal.scale.set(app.decalMap_scale, app.decalMap_scale, app.decalMap_scale);
                        break;
                }
            } else {
                skyland_shadow_decal.material.visible = false;
                skyland_tunnel_shadow_decal.material.visible = false;
                tank_shadow_decal.material.visible = false;
            }

            // material decal control
            if (app.level.mission == app.missionTypes.fortress) {
                switch (app.level.stageIndex) {
                    case app.stages.grasslands:
                        if (app.fortress.asset.object.position.y + 50 > app.playerObject.worldPosition.y) {
                            app.tunaObject.material.uniforms.decal_channels.value = app.decalChannels.ships_tunnels;
                            app.fortress.asset.material.uniforms.decal_channels.value = app.decalChannels.none;
                        } else {
                            app.tunaObject.material.uniforms.decal_channels.value = app.decalChannels.tunnels;
                            app.fortress.asset.material.uniforms.decal_channels.value = app.decalChannels.player;
                        }
                        break;
                    case app.stages.lava:
                        if (app.fortress.asset.chassis.position.y + 70 > app.playerObject.worldPosition.y) {
                            app.tunaObject.material.uniforms.decal_channels.value = app.decalChannels.ships_tunnels;
                            app.fortress.asset.material.uniforms.decal_channels.value = app.decalChannels.none;
                        } else {
                            app.tunaObject.material.uniforms.decal_channels.value = app.decalChannels.tunnels;
                            app.fortress.asset.material.uniforms.decal_channels.value = app.decalChannels.player;
                        }
                        break;
                }
            } else if (app.level.mission == app.missionTypes.travel) {
                app.tunaObject.material.uniforms.decal_channels.value = app.decalChannels.tunnels;
            }
        }
    }

    app.update_lindwormDecal = function (timer) {
        lindworm_shadow_decal_material.uniforms.rotation_progress.value = timer;
    }

    return app;
}(MODULE));