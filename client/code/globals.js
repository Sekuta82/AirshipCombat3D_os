(function (app) {
    app.isKaiOS = false;
    app.isQWERTY = false;
    app.isTouchDevice = false;
    app.landscapeOrientation = false;
    app.orientation_changed = false;
    app.isPage = false;

    app.version = '010423';
    let version_array = app.version.match(/.{1,2}/g);
    app.versionString = parseInt(version_array[0]).toString() + '.' + parseInt(version_array[1]).toString() + '.' + parseInt(version_array[2]).toString();


    // debug
    app.isLocalServer = false;
    app.isTestServer = false;
    app.mp_random_playerID = false;
    app.autoplay = false;
    app.debuggenzeit = false;
    app.debugKeys = false;
    app.doubleSpeed = false;
    app.isStressTest = false;
    app.isRaycastTest = false;
    app.unlockAllLevels = false;
    app.debugHUD = document.getElementById("debugHUD");

    // settings
    app.invertAxis = true;
    app.reflections_on = true;
    app.shadowDecals_on = true;
    app.supersampling_on = true;
    app.soundfx_on = true;
    app.playerID = null;
    app.playerName = '';
    app.start_levelID = '302729716';
    app.mp_server = "wss://[DOMAIN]";

    //globals
    app.pi = Math.PI;
    app.pi2 = Math.PI * 2;
    app.frameCount = 0;
    app.upVector = new THREE.Vector3(0, 1, 0);
    app.downVector = new THREE.Vector3(0, -1, 0);

    app.clock = new THREE.Clock(true);
    app.deltaTime = 0.0;
    app.deltaTime_half = 0.0;
    app.deltaTime_double = 0.0;
    app.deltaTime_triple = 0.0;

    app.renderingWidth = app.renderingHeight = 288;
    app.screenWidth = app.screenHeight = 288;
    app.screenWidthHalf = app.screenWidth * 0.5;
    app.screenHeightHalf = app.screenHeight * 0.5;

    app.terrain_scaleFactor = 30.0;
    app.terrain_scale = 1 / (100 * app.terrain_scaleFactor);
    app.terrainHeight = 1;

    const gameWindow = document.getElementById('gameWindow');
    app.renderer = new THREE.WebGLRenderer({ canvas: gameWindow });
    app.renderer.antialiasing = false;
    app.renderer.autoClear = false;
    app.renderer.stencil = false;
    app.renderer.powerPreference = "high-performance";

    app.camera = new THREE.PerspectiveCamera(85, app.screenWidth / app.screenHeight, 0.1, app.terrain_scaleFactor * 60);
    app.scene = new THREE.Scene();
    app.shadowScene = new THREE.Scene();

    app.animationLoop;

    app.mp_playerLimit = 4;

    // state
    app.gltf_loadingDone = false;
    app.assets_loadingDone = false;
    app.level_ready = false;
    app.require_reset = true;
    app.gameRunning = false;
    app.gamePaused = true;
    app.inMenu = true;
    app.isInputFocused = false;
    app.missionCompleted = false;
    app.playerMoving = true;
    app.playerKilled = false;
    app.playerInsideTunnel = false;
    app.benchmarkMode = false;
    app.previous_stage = -1;
    app.previous_level = {};
    app.next_level = {};
    app.stageIndex = 0;
    app.levelIndex = 0;
    app.totalScore = 0;
    app.currentScore = 0;
    app.levelScores = [];
    app.hud_refreshRate = 4;
    app.radar_refreshRate = 30;
    app.decal_refreshRate = 2;
    app.rocket_terrainCollision_refreshRate = 4;
    app.lockon_refreshRate = 15; // multiple of 3 due to turret loop split into 3
    app.movingDirection = new THREE.Vector3(0, 0, 0);
    app.terrainVisible = true;
    app.cloudsVisible = true;
    app.enemyRocket_power = 0;
    app.playerSelectedSpeed = 1.0;
    app.enemyRocket_speed = 300;
    app.playerRocket_speed = 400;

    app.multiplayerMode = false;
    app.mp_refreshRate = 20;
    app.mp_connected = false;
    app.mp_join_released = false;
    app.mp_joined = false;
    app.mp_stage = 0;
    app.mp_leader_ppID = 0;
    app.reverseView = 0;

    app.batteryLevel;
    app.batteryTemperature;

    // textures
    // app.maxAnisotropy = 0;
    app.totalTextureCount = 0;
    app.texturesLoaded = 0;

    // objects
    app.gltf_scenes = {};
    app.playerObject = {};
    app.terrainObject = {};
    app.tunaObject = {};
    app.debugCubeObject = {};

    // object instances
    app.instance_parkingPosition = new THREE.Vector3(1000, -1000, 0);
    app.turret_pool = [];
    app.turret_pool_size = 18;
    app.turret_group = new THREE.Group();

    app.enemyRocket_pool = [];
    app.playerRocket_pool = [];
    app.rocket_group = new THREE.Group();

    app.fighter_pool = [];
    app.fighter_pool_size = 5;
    app.fighter_group = new THREE.Group();

    app.fortress = null;
    app.boostPortal = null;
    app.destination = null;
    app.platformObject = null;
    app.asteroidsObject = null;
    app.volcanoObject = null;
    app.skylandObject = null;
    app.tankObject = null;
    app.boss = null;
    app.lindwormObject = null;
    app.orbObject = null;
    app.planetObject = null;

    app.lockOnTarget = {};
    app.raycastTargets = [];

    app.mp_player_pool = [];
    app.mp_rocket_pool = [];
    app.mp_player_group = new THREE.Group();

    app.turret_spawnDistance = app.terrain_scaleFactor * 40;
    app.rocket_destructDistance = app.terrain_scaleFactor * 60;
    app.fighter_spawnDistance = app.terrain_scaleFactor * 40;
    app.radar_spawn_distance = app.turret_spawnDistance * 2;
    app.radar_spawn_distance_mp = 5000;
    app.destination_radius = 0;
    app.collisionIterations = app.debuggenzeit ? 4 : 2;
    app.boostPortal_spawnDistance = 500;
    app.maxRaycastDistance = 1500;

    // enums
    app.missionTypes = { fortress: 0, travel: 1, race: 2, cave: 3, survival: 4, boss: 5, sandbox: 6, mp_deathmatch: 7 };
    app.stages = { grasslands: 0, lava: 1, desert: 2, space: 3, tbc: 4 };
    app.destinations = { platform: [0, 200], fortress: [1, 800], volcano: [2, 1500], orb: [3, 3000], planet: [4, 1000] }; // [index,radius]
    app.fortresses = { skyland: 0, tank: 1 };
    app.bossTypes = { lindworm: 0, orb: 1 };
    app.turretLocations = { terrain: 0, fortress: 1 };
    app.animationTypes = { oneshot: 0, loop: 1, triangle: 2 };
    app.decalChannels = { none: 0, player: 1, player_ships: 2, all: 3, ships_tunnels: 4, tunnels: 5, player_tunnels: 6 };
    app.difficulty = { easy: 0, medium: 1, hard: 2 }

    // colors
    app.color_white = new THREE.Color(0xffffff);
    app.color_black = new THREE.Color(0x000000);
    app.color_red = new THREE.Color(0xff0000);
    app.color_green = new THREE.Color(0x00ff00);
    app.color_blue = new THREE.Color(0x0000ff);
    app.color_orange = new THREE.Color(0xff6600);
    app.player_rocket_color = new THREE.Color(0x1133ff);
    app.turret_rocket_color = new THREE.Color(0xff2211);
    app.color_sand = new THREE.Color(0x695536);
    app.color_asteroid = new THREE.Color(0xB7AEA2);

    // functions
    app.rotate2d = function (angle, vector) {
        return new THREE.Vector2(Math.cos(angle) * vector.x + Math.sin(angle) * vector.y,
            Math.cos(angle) * vector.y - Math.sin(angle) * vector.x);
    }

    app.angleToPoint2D = function (p1, p2, p3, p4) {
        var angleToTarget = 0.0;
        if (p4) {
            angleToTarget = Math.atan2(p1 - p3, p2 - p4);
        } else {
            angleToTarget = Math.atan2(p1.x - p2.x, p1.y - p2.y);
        }
        if (isNaN(angleToTarget)) { return 0 };
        return angleToTarget;
    }

    app.addToScore = function (damage, target) {
        let score;
        let position;
        if (target.health) {
            if (damage >= target.health) {
                score = target.health * 2;
            } else {
                score = damage;
            }
            position = target.worldPosition;
        } else if (target.point) {
            score = damage;
            position = target.point;
        }
        app.spawn_scoreSprite(score, position);
        app.currentScore += score;
    }

    var currentQuaternion = new THREE.Quaternion();
    var newQuaternion = new THREE.Quaternion();

    app.lazyLookAt = function (object, targetPosition, speed) {
        currentQuaternion.copy(object.quaternion);
        object.lookAt(targetPosition);
        newQuaternion.copy(object.quaternion);
        THREE.Quaternion.slerp(currentQuaternion, newQuaternion, object.quaternion, app.deltaTime * speed);
    }

    app.removeObjectFromScene = function (object) {
        let parent = object.parent;
        if (parent) {
            parent.remove(object);
        }
        delete object;
    }

    app.removeMeshFromScene = function (mesh, withParent) {
        let parent = mesh.parent;
        if (parent && withParent) {
            let grandParent = parent.parent;
            if (grandParent) {
                grandParent.remove(parent);
            } else {
                parent.remove(mesh);
            }
        } else if (parent) {
            parent.remove(mesh);
        }
        delete mesh;
    }

    app.dispose_geometry = function (root) {
        if (root.children) {
            for (let i = 0; i < root.children.length; i++) {
                if (root.children[i].type == 'Mesh') {
                    // if (app.debuggenzeit) console.log('disposing', root.name, root.children[i].name);
                    root.children[i].geometry.dispose();
                }
                app.dispose_geometry(root.children[i]); // recursion
            }
        } else {
            if (root.type == 'Mesh') {
                // if (app.debuggenzeit) console.log('disposing', root.name);
                root.geometry.dispose();
                root.geometry = null;
            }
        }
    }

    app.dispose_texture = function (texture) {
        texture.dispose();
        texture = null;
    }

    app.dispose_material = function (material) {
        material.dispose();
        material = null;
    }

    const lockon_distance = 700;
    const lockon_angle = 0.5;
    var current_angle = 0;
    var lockonObstacle;

    var targetDirection = new THREE.Vector3();

    app.target_lockOn = function (target) {
        // check for obstacles
        targetDirection.subVectors(target.worldPosition, app.playerObject.worldPosition).normalize();
        lockonObstacle = app.raycast2object(app.playerObject.worldPosition, targetDirection);
        if (lockonObstacle) {
            if (target.distance > lockonObstacle.distance) return;
        }

        // angle to player
        current_angle = Math.atan2(target.radarPosition.x, target.radarPosition.y);
        if (current_angle > -lockon_angle && current_angle < lockon_angle && target.distance < lockon_distance) {
            app.lockOnTarget = {
                hitObject: target
            };
        }
    }

    app.get_parentRotationY = function (object) {
        var rotation = 0;
        let parent;
        if (object.parent) {
            parent = object.parent;
            rotation = parent.rotation.y;
            if (parent.parent) {
                parent = parent.parent;
                rotation += parent.rotation.y;
                if (parent.parent) {
                    parent = parent.parent;
                    rotation += parent.rotation.y;
                    if (parent.parent) {
                        parent = parent.parent;
                        rotation += parent.rotation.y;
                        if (parent.parent) console.warn('one more parent level found');
                    }
                }
            }
        }
        //console.log('parent rotation ',rotation);
        return rotation;
    }

    app.alignRotation = function (angle) {
        if (angle > app.pi) {
            angle -= app.pi2;
        } else if (angle < -app.pi) {
            angle += app.pi2;
        }
        return angle;
    }

    // convert to geometry to speed up raycasting
    app.bufferGeometry2geometry = function (buffergeometry) {
        var geo = new THREE.Geometry();
        geo.fromBufferGeometry(buffergeometry);
        geo.mergeVertices();
        return geo;
    }

    app.animateSpritesheet = function (animation, frames, rotation, type, destroy, owner) {
        let atlas_index = animation.object.material.uniforms.atlas_index.value;
        let parent;
        if (animation.object.parent) {
            parent = animation.object.parent;
        }
        atlas_index++;
        animation.object.material.uniforms.atlas_index.value = atlas_index;
        animation.object.material.uniforms.rotation.value = rotation * app.deltaTime;

        if (type == app.animationTypes.oneshot) {
            if (atlas_index >= frames) {
                clearInterval(animation.interval);
                if (destroy) {
                    if (parent) {
                        if (owner == 0) {
                            animation.object.remove(app.explosion_sound0);
                        } else {
                            animation.object.remove(app.explosion_sound1);
                        }
                        parent.remove(animation.object);
                    }
                    animation.object.material.dispose();
                    delete animation;
                }
            }
        }
    }

    var pulse_startColor = new THREE.Color(0xffffff);
    var pulse_targetColor = new THREE.Color(0xffffff);

    app.colorLerp = function (startColor, targetColor, progress) {
        pulse_startColor.copy(startColor);
        pulse_targetColor.copy(targetColor);
        return pulse_startColor.lerp(pulse_targetColor, progress);
    }

    app.whiteOut = function (material) {
        material.uniforms.whiteOut.value = true;
        setTimeout(function () { material.uniforms.whiteOut.value = false; }, 150);
    }

    return app;
}(MODULE));