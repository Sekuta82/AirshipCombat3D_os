(function (app) {
    var player_worldPosition = new THREE.Vector3();
    var player_worldPosition2D = new THREE.Vector2();
    var player_worldDirection = new THREE.Vector3();
    var player_rocketLauncher_worldPosition = new THREE.Vector3();
    var movingTarget_worldPosition = new THREE.Vector3();
    var camera_worldPosition = new THREE.Vector3();

    const tuna_health = 100;
    const crash_damage = 10;
    const forwardSpeed = 45.0;
    const verticalBounds = [0, 500];
    var verticalMovement = 0.0, verticalMovement_velocity = 0.0;
    var player_rotationX = 0.0;
    var player_targetRotationY = 0.0;
    var player_forward_velocity = 0.0;
    var player_rotationX_velocity = 0.0;
    var player_rotationY_velocity = 0.0;
    var local_rotation_vector = new THREE.Vector3();
    var local_rotation_velocity = new THREE.Vector3();
    var prev_direction = new THREE.Vector2();
    var direction = new THREE.Vector2();

    app.init_player = function () {
        if (app.playerObject.player) return;

        // create player
        var player = new THREE.Group();
        var pivot = new THREE.Group();
        player.add(pivot);
        pivot.add(app.camera);
        pivot.add(app.tunaObject.ship);

        var movingTarget = new THREE.Group();
        movingTarget.name = 'movingTarget';
        movingTarget.position.z = 50;
        player.add(movingTarget);

        app.scene.add(player);

        // player stats
        app.playerObject = {
            player: player,
            pivot: pivot,
            worldPosition: player_worldPosition,
            worldPosition2D: player_worldPosition2D,
            worldDirection: player_worldDirection,
            targetRotationY: 0,
            verticalMovement: 0,
            targetVerticalMovement: 0,
            turningInput: direction,
            crosshairObject: null,
            distanceToTerrain: 0.0,
            distanceToGround: 0.0,
            asset: app.tunaObject,
            movingTarget: movingTarget,
            movingTarget_worldPosition: movingTarget_worldPosition,
            camera_worldPosition: camera_worldPosition,
            rocketLauncher_worldPosition: player_rocketLauncher_worldPosition,
            health: (app.multiplayerMode) ? tuna_health * 2 : tuna_health,
            weaponHeat: 0,
            weaponCharge: 0,
            damage: [0, 0, 0, 0, 0, 0],
            speed: 0,
            targetSpeed: 0,
            killScore: 0,
            hitScore: 0,
            mpLeader: 0
        };
        Object.seal(app.playerObject);

        // camera
        app.camera.rotation.x = 0.3;
        app.camera.position.z = -50;
        app.camera.rotation.y = app.pi;
        app.reverseView = 0;
    }

    app.reset_player = function () {
        let spawnPos = app.level.playerStartPosition.clone();

        if (app.multiplayerMode) {
            // randomize position 
            let randomPos = new THREE.Vector3();
            randomPos = new THREE.Vector3(Math.random() * 3000, Math.random() * 300, Math.random() * 3000)
            app.playerObject.player.rotation.set(0, Math.random() * 6, 0);
            spawnPos.add(randomPos);
            app.tunaObject.crosshair.visible = true;
        } else {
            app.playerObject.player.rotation.set(0, 0, 0);
            app.tunaObject.crosshair.visible = false;
        }
        app.playerObject.player.position.copy(spawnPos);
        app.playerObject.pivot.rotation.set(0, 0, 0);
        app.playerObject.targetRotationY = player_targetRotationY = player_rotationY_velocity = app.playerObject.player.rotation.y;
        app.playerObject.targetVerticalMovement = 0;
        app.playerObject.crosshairObject = null;
        player_forward_velocity = player_rotationX = player_rotationX_velocity = verticalMovement = verticalMovement_velocity = 0;
        local_rotation_vector.set(0, 0, 0);
        local_rotation_velocity.set(0, 0, 0);
        app.playerObject.worldPosition.copy(spawnPos);
        app.playerObject.asset.material.uniforms.diffuse.value = app.color_white;
        app.playerKilled = false;
        app.playerObject.health = (app.multiplayerMode) ? tuna_health * 2 : tuna_health;
        app.playerObject.weaponHeat = 0;
        app.playerObject.speed = app.playerObject.targetSpeed = 0;
        app.playerSelectedSpeed = 1.0;
        app.update_throttle_hud();

        if (app.level.stageIndex != app.stages.space) {
            app.playerObject.asset.wings.visible = true;
            app.playerObject.asset.rotor.visible = true;
            app.playerObject.asset.jet.visible = false;
            app.playerObject.asset.wing_jet.visible = false;
        } else {
            app.playerObject.asset.wings.visible = false;
            app.playerObject.asset.rotor.visible = false;
            app.playerObject.asset.jet.visible = true;
            app.playerObject.asset.wing_jet.visible = true;
        }
    }

    var player_speed = 0;

    function movePlayerForward() {
        app.movingDirection.setFromMatrixColumn(app.playerObject.player.matrix, 0);
        app.movingDirection.crossVectors(app.playerObject.player.up, app.movingDirection);

        if (app.level.stageIndex != app.stages.space) {
            app.movingDirection.y = verticalMovement_velocity;
        } else {
            app.movingDirection.y = app.playerObject.pivot.rotation.x;
        }

        app.playerObject.player.position.addScaledVector(app.movingDirection, -player_speed * app.deltaTime);
    };

    var distance2terrain = 0.0;
    var distance2ground = 0.0;

    const player_collisionDistance = 0.25;
    var player_movement_slowdown = 0;
    var camera_push_velocity = 0;
    var rotation_vector_clamp_upper = new THREE.Vector3(0.5, 0.5, 0.5);
    var rotation_vector_clamp_lower = new THREE.Vector3(-0.5, -0.5, -0.5);
    var jet_time = 0;

    app.update_player = function () {
        // fly forward
        player_movement_slowdown = 1.0 + verticalMovement_velocity * 0.4 - Math.abs(local_rotation_vector.y) * 0.6;
        if (app.level.stageIndex != app.stages.space) {
            player_movement_slowdown *= app.playerSelectedSpeed;
            player_forward_velocity = THREE.Math.lerp(player_forward_velocity, player_movement_slowdown, app.deltaTime);
        } else {
            player_movement_slowdown *= app.playerSelectedSpeed * 1.4;
            if (app.level.mission == app.missionTypes.race) player_movement_slowdown *= 50;
            player_forward_velocity = THREE.Math.lerp(player_forward_velocity, player_movement_slowdown, app.deltaTime * 0.5);
        }
        player_forward_velocity = Math.max(player_forward_velocity, 0);
        player_speed = forwardSpeed * player_forward_velocity;
        app.playerObject.speed = player_speed;
        app.playerObject.targetSpeed = forwardSpeed * player_movement_slowdown;
        if (player_forward_velocity < 0.95 || player_forward_velocity > 1.05 || app.orientation_changed) {
            if (app.landscapeOrientation) {
                app.camera.fov = THREE.Math.lerp(75, 76, Math.min(player_forward_velocity, 10));
            } else {
                app.camera.fov = THREE.Math.lerp(78, 81, Math.min(player_forward_velocity, 10));
            }
            app.camera.updateProjectionMatrix();
        }

        if (app.playerMoving) movePlayerForward();

        if (!app.playerKilled) {
            // flight controls
            direction.x = Number(app.moveRight) - Number(app.moveLeft);
            direction.y = Number(app.moveDown) - Number(app.moveUp);
            direction.normalize();
            app.playerObject.turningInput.copy(direction);

            if (app.moveLeft || app.moveRight) {
                if (app.level.stageIndex != app.stages.space) {
                    player_targetRotationY -= direction.x * app.deltaTime;
                    local_rotation_vector.y -= direction.x * app.deltaTime_double;
                } else {
                    player_targetRotationY -= direction.x * app.deltaTime * 0.7;
                    local_rotation_vector.y -= direction.x * app.deltaTime_double;
                }
            } else {
                // lerp to 0
                local_rotation_vector.y -= local_rotation_vector.y * app.deltaTime_triple;
            }
            if (app.level.stageIndex != app.stages.space) {
                if ((app.moveUp && app.playerObject.player.position.y < verticalBounds[1]) || (app.moveDown && app.playerObject.player.position.y > verticalBounds[0])) {
                    verticalMovement = (direction.y > 0) ? 1.0 : -0.7;
                    local_rotation_vector.x -= direction.y * app.deltaTime_triple;
                } else {
                    verticalMovement = 0;
                    // lerp to 0
                    local_rotation_vector.x -= local_rotation_vector.x * app.deltaTime_triple;
                }
            } else {
                if (app.moveUp || app.moveDown) {
                    if (app.level.stageIndex == app.stages.space) {
                        player_rotationX += direction.y * app.deltaTime * 0.7;
                        player_rotationX = Math.min(1.4, Math.max(-1.4, player_rotationX));
                    }
                    local_rotation_vector.x -= direction.y * app.deltaTime_triple;
                } else {
                    verticalMovement = 0;
                    // lerp to 0
                    local_rotation_vector.x -= local_rotation_vector.x * app.deltaTime_triple;
                }
            }
        }

        local_rotation_vector.clamp(rotation_vector_clamp_lower, rotation_vector_clamp_upper);

        if (app.level.stageIndex != app.stages.space) {
            verticalMovement_velocity = THREE.Math.lerp(verticalMovement_velocity, verticalMovement, app.deltaTime_half);
            app.playerObject.targetVerticalMovement = verticalMovement;
            app.playerObject.verticalMovement = verticalMovement_velocity;
            app.playerObject.asset.wings.rotation.x = local_rotation_vector.x;
            app.playerObject.asset.top_fin.rotation.y = app.playerObject.asset.rear_fin.rotation.y = -local_rotation_vector.y;
            app.playerObject.asset.rotor.rotation.z -= app.deltaTime * 20.0 * player_forward_velocity;
            app.camera.position.y = local_rotation_velocity.x * -50.0 + 15.0 - camera_push_velocity;
            app.camera.rotation.x = -local_rotation_velocity.x * 0.3;
            app.camera.rotation.z = -local_rotation_velocity.y * 0.5;
        } else {
            app.playerObject.asset.top_fin.rotation.y = app.playerObject.asset.rear_fin.rotation.y = 0;
            player_rotationX_velocity = THREE.Math.lerp(player_rotationX_velocity, player_rotationX, app.deltaTime_half);
            app.playerObject.pivot.rotation.x = player_rotationX_velocity;
            app.playerObject.asset.wing_jet.rotation.x = -local_rotation_vector.x;
            app.playerObject.asset.jet.children[1].rotation.y = -local_rotation_vector.y;
            jet_time += app.deltaTime;
            app.playerObject.asset.jet_material.uniforms.time.value = jet_time;
            app.playerObject.asset.jet_material.uniforms.speed.value = app.playerSelectedSpeed;
            app.camera.position.y = 15.0;
        }
        if (app.reverseView == 1) {
            app.camera.position.z = 50;
            app.camera.rotation.y = 0;
        } else {
            app.camera.position.z = -50;
            app.camera.rotation.y = app.pi;
        }
        player_rotationY_velocity = THREE.Math.lerp(player_rotationY_velocity, player_targetRotationY, app.deltaTime_half);
        app.playerObject.targetRotationY = player_targetRotationY;
        app.playerObject.player.rotation.y = player_rotationY_velocity;
        app.playerObject.player.getWorldPosition(app.playerObject.worldPosition);
        app.playerObject.worldPosition2D.set(app.playerObject.worldPosition.x, app.playerObject.worldPosition.z);
        app.playerObject.asset.ship.getWorldDirection(app.playerObject.worldDirection);
        app.playerObject.movingTarget.position.z = player_speed - 10;
        app.playerObject.movingTarget.getWorldPosition(movingTarget_worldPosition);
        app.playerObject.movingTarget_worldPosition.copy(movingTarget_worldPosition);
        app.camera.getWorldPosition(camera_worldPosition);
        app.playerObject.camera_worldPosition.copy(camera_worldPosition);
        app.playerObject.asset.rocketLauncher.getWorldPosition(app.playerObject.rocketLauncher_worldPosition);

        local_rotation_velocity.lerp(local_rotation_vector, app.deltaTime_half);
        app.playerObject.asset.ship.rotation.set(-local_rotation_velocity.x, local_rotation_velocity.y, -local_rotation_velocity.y, 'XYZ');

        // send update if steering input has changed
        if (app.multiplayerMode) {
            // move crosshair
            app.tunaObject.crosshair.position.x = local_rotation_velocity.y * -150;
            app.tunaObject.crosshair.position.y = 5 + Math.abs(local_rotation_velocity.y) * -50;
            app.tunaObject.crosshair.position.y -= local_rotation_velocity.x * 20;
            // send steering update
            if (prev_direction.x != direction.x || prev_direction.y != direction.y) {
                app.send_mp_update();
            }
            prev_direction.copy(direction);
        }

        if (app.frameCount % app.decal_refreshRate == 0 && app.shadowDecals_on && app.level.stageIndex != app.stages.space) {
            app.playerObject.asset.material.uniforms.decalMap_scale.value = app.decalMap_scale;
            app.playerObject.asset.material.uniforms.origin.value.set(app.playerObject.player.position.x, app.playerObject.player.position.z - 20);
        }

        distance2terrain = app.playerObject.worldPosition.y - player_collisionDistance * app.playerObject.speed - 5;
        app.playerObject.distanceToTerrain = distance2terrain;
        app.playerObject.distanceToGround = Math.min(distance2ground, distance2terrain);

        if (app.playerObject.health < 0 && !app.playerKilled) {
            app.playerKilled = true;
            app.spawn_smallExplosion(60, 300, app.playerObject.worldPosition, 1);
            // console.log('viewGameOver');
            app.set_ticker('ship destroyed!');
            app.menu_show('viewGameOver', 3000);
            if (app.soundfx_on) app.explosion_sound1.setDetune(-1000);
        }

        if (app.playerObject.health < 50) {
            colorPulse();
        }

        update_collisions();

        // weapon cool down
        if (app.playerObject.weaponHeat > 0) {
            app.playerObject.weaponHeat -= app.deltaTime * 8;
        }
    }

    var terrain_rayOrigin = new THREE.Vector3(0.0, 0.0, 0.0);
    var terrain_hitPoint;
    var collision_target = {};
    var camera_collision_target = {};
    var player_direction2D = new THREE.Vector2(0.0, 0.0);
    var player_raycastDirections = { forward: 0, backward: 1, up: 2, down: 3, left: 4, right: 5 };
    var player_raycastDirection;
    var player_raycastDirection3D = new THREE.Vector3(0.0, 0.0, 0.0);
    var player_ship_raycastDirection = new THREE.Vector3(0.0, 0.0, 0.0);
    var player_directionRotated;

    var collisionDirection = new THREE.Vector3();

    var objectIsClose = false;
    var raytarget_worldPosition = new THREE.Vector3();

    var object_distance;
    var object_distance_threshold;

    function update_collisions() {
        if (app.terrainVisible && app.frameCount % 6 == 0 && distance2terrain < 0) {
            // check collision with ground
            terrain_rayOrigin.copy(app.playerObject.worldPosition);
            terrain_rayOrigin.addScaledVector(app.movingDirection, -10); // offset in moving direction
            terrain_hitPoint = app.raycast2terrain(terrain_rayOrigin, app.downVector);
            if (terrain_hitPoint) {
                if (terrain_hitPoint.position.y >= distance2terrain) {
                    // if (app.debuggenzeit) console.log('ship touched the ground');
                    if (!app.multiplayerMode) {
                        app.damage_player(crash_damage, player_raycastDirections.down);
                        if (app.soundfx_on) app.play_collision_sound(crash_damage);
                    }
                    app.playerObject.player.position.y = terrain_hitPoint.position.y + player_collisionDistance * app.playerObject.speed + 10;
                    local_rotation_velocity.x -= local_rotation_velocity.x * 0.3;
                }

                if (app.isStressTest || app.isRaycastTest) {
                    let size = [10, 20, 10];
                    let cube = app.get_cube(size, "rgb(" + terrain_hitPoint.color[0] + "," + terrain_hitPoint.color[1] + "," + terrain_hitPoint.color[2] + ")");
                    cube.position.copy(terrain_hitPoint.position);
                    app.scene.add(cube);
                }
            }
        }

        if (app.multiplayerMode) return;


        //collide with objects
        player_direction2D.set(app.playerObject.worldDirection.x, app.playerObject.worldDirection.z);

        // check for objects close by
        if (app.level.stageIndex != app.stages.space && app.level.mission != app.missionTypes.race) {
            for (let i = 0; i < app.raycastTargets.length; i++) {
                app.raycastTargets[i].getWorldPosition(raytarget_worldPosition);
                object_distance = Math.round(raytarget_worldPosition.distanceTo(app.playerObject.worldPosition));
                object_distance_threshold = app.level.destination ? app.level.destination[1] : 500;
                if (object_distance < object_distance_threshold) {
                    objectIsClose = true;
                    break;
                }
                objectIsClose = false;
            }
        } else {
            objectIsClose = true;
        }

        // crosshair position
        if (app.frameCount % 2 == 0) {
            app.playerObject.crosshairObject = app.raycast2object(app.playerObject.worldPosition, app.playerObject.worldDirection);
        }

        if (objectIsClose) {
            if (app.frameCount % 12 == 0) {
                player_raycastDirection = player_raycastDirections.forward;
                app.playerObject.player.getWorldDirection(player_raycastDirection3D);
            } else if (app.frameCount % 12 == 2) {
                player_raycastDirection = player_raycastDirections.backward;
                app.playerObject.player.getWorldDirection(player_raycastDirection3D);
            } else if (app.frameCount % 12 == 4) {
                player_raycastDirection = player_raycastDirections.left;
                player_directionRotated = app.rotate2d(app.pi * 0.5, player_direction2D);
                player_raycastDirection3D.set(player_directionRotated.x, 0, player_directionRotated.y);
            } else if (app.frameCount % 12 == 6) {
                player_raycastDirection = player_raycastDirections.right;
                player_directionRotated = app.rotate2d(app.pi * -0.5, player_direction2D);
                player_raycastDirection3D.set(player_directionRotated.x, 0, player_directionRotated.y);
            } else if (app.frameCount % 12 == 8) {
                player_raycastDirection = player_raycastDirections.up;
                player_raycastDirection3D.set(0, 1, 0);
            } else if (app.frameCount % 12 == 10) {
                player_raycastDirection = player_raycastDirections.down;
                player_raycastDirection3D.set(0, -1, 0);
            }

            collision_target = app.raycast2object(app.playerObject.worldPosition, player_raycastDirection3D);
            if (collision_target) {
                bouncePlayer(collision_target, player_raycastDirection);
            }

            // set distance to object underneath
            if (collision_target && player_raycastDirection == player_raycastDirections.down) {
                distance2ground = collision_target.distance;
            } else if (!collision_target && player_raycastDirection == player_raycastDirections.down) {
                distance2ground = 1000.0;
            }

            // camera collisions
            camera_collision_target = app.raycast2object(app.playerObject.camera_worldPosition, app.upVector);
            if (camera_collision_target) {
                camera_push_velocity = THREE.Math.lerp(camera_push_velocity, pushCamera(camera_collision_target), app.deltaTime_double);
            } else if (camera_push_velocity > 0) {
                // lerp to 0
                camera_push_velocity -= camera_push_velocity * app.deltaTime;
            }
        }
    }

    app.damage_player = function (damage, directionIndex) {
        if (app.benchmarkMode) return;

        app.playerObject.health -= damage;
        switch (directionIndex) {
            case player_raycastDirections.forward:
                app.playerObject.damage[0] += damage;
                break;
            case player_raycastDirections.backward:
                app.playerObject.damage[1] += damage;
                break;
            case player_raycastDirections.left:
                app.playerObject.damage[2] += damage;
                break;
            case player_raycastDirections.right:
                app.playerObject.damage[3] += damage;
                break;
            case player_raycastDirections.up:
                app.playerObject.damage[4] += damage;
                break;
            case player_raycastDirections.down:
                app.playerObject.damage[5] += damage;
                break;
        }
    }

    app.boost_player = function (boost) {
        player_forward_velocity += boost;
    }

    //var collisionAngle = 0.0;
    var collisionDirectionFactor = 0;

    function bouncePlayer(target, directionIndex) {
        collisionDirection.copy(app.playerObject.worldPosition);
        collisionDirection.sub(target.point);
        collisionDirection.normalize();
        collisionDirectionFactor = Math.abs(app.playerObject.worldDirection.dot(target.face.normal));
        let collisionDistance = player_collisionDistance * app.playerObject.speed + 5;
        if (directionIndex == player_raycastDirections.up || directionIndex == player_raycastDirections.down) {
            if (target.distance < collisionDistance) {
                collideWithObject(target, collisionDirection, directionIndex, collisionDirectionFactor, collisionDistance, crash_damage);
            }
        } else {
            if (target.distance < collisionDistance) {
                collideWithObject(target, collisionDirection, directionIndex, collisionDirectionFactor, collisionDistance, crash_damage);
            }
        }
    }

    function collideWithObject(target, directionVector, directionIndex, slowdown, bounceDistance, damage) {
        app.damage_player(Math.ceil(damage * slowdown), directionIndex);
        player_forward_velocity -= slowdown;
        app.playerObject.player.position.addScaledVector(directionVector, bounceDistance);
        if (app.soundfx_on) app.play_collision_sound(slowdown);
    }

    var camera_push_distance = 0;
    function pushCamera(target) {
        camera_push_distance = Math.max(0, 20 - target.distance);
        return camera_push_distance;
    }

    var colorPulse_progress = 0;
    var colorPulse_invert = false;
    var colorPulse_factor = 0;
    var colorPulse_speed = 0;

    function colorPulse() {
        if (app.playerObject.health >= tuna_health) return;

        colorPulse_factor = 1 - (app.playerObject.health * 0.01);
        colorPulse_speed = app.deltaTime * colorPulse_factor;

        if (colorPulse_progress <= 0) {
            colorPulse_invert = false;
        } else if (colorPulse_progress >= colorPulse_factor) {
            colorPulse_invert = true;
        }
        if (!colorPulse_invert) {
            colorPulse_progress += colorPulse_speed;
        } else {
            colorPulse_progress -= colorPulse_speed;
        }
        app.playerObject.asset.material.uniforms.diffuse.value = app.colorLerp(app.color_white, app.color_orange, colorPulse_progress);
    }

    // ======== PLAYER ROCKETS ========
    app.chargeInterval;

    app.chargeWeapon = function () {
        if (app.playerObject.weaponCharge < 100) {
            clearInterval(app.chargeInterval);
            app.chargeInterval = setInterval(function () { if (app.playerObject.weaponCharge < 100) app.playerObject.weaponCharge += 4; }, 15);
        }
    }

    return app;
}(MODULE));