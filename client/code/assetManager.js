(function (app) {

    app.level = app.level_skyland;

    function checkLoadingStatus(stage) {
        if (app.gltf_loadingDone && app.texturesLoaded >= app.totalTextureCount) {
            if (app.terrainVisible) app.terrainObject.heightMapData = terrain_heightMapData;
            if (stage == 'init') {
                // if (app.debuggenzeit) console.log('init loaded');
                for (let i = 0; i < Object.keys(gltf_files).length; i++) {
                    let key = Object.keys(gltf_files)[i]; // get key by index
                    get_objects(key); // do something after loading
                }
                app.scene_init();
                app.gltf_loadingDone = false;
            } else if (stage == 'level') {
                // if (app.debuggenzeit) console.log('level loaded');
                app.assets_loadingDone = true;
            }
            clearInterval(app.resourceLoadingCheck_interval);
            app.resourceLoadingCheck_interval = null;
        }
    }

    // GLTF list
    var gltf_files = {
        'terrain_ground': 'assets/terrain/terrain_ground.glb',
        'tuna': 'assets/tuna/tuna.glb',
        'turret': 'assets/turret/turret.glb',
        'boostPortal': 'assets/portal/boost_portal.glb',
        'fighter': 'assets/fighter/fighter.glb'
    }

    function update_terrainTextures() {
        terrain_material.uniforms.colorMap.value = terrain_colorMap;
        terrain_material.uniforms.colorMap.value.wrapS = terrain_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        terrain_colorMap.needsUpdate = true;

        app.terrainObject.heightMap = terrain_heightMap;
        terrain_material.uniforms.heightMap.value = terrain_heightMap;
        terrain_material.uniforms.heightMap.value.wrapS = terrain_material.uniforms.heightMap.value.wrapT = THREE.RepeatWrapping;
        terrain_heightMap.needsUpdate = true;
    }

    function update_cubeMap() {
        app.scene.background = app.cubeMap;
        for (let i = 0; i < materials.length; i++) {
            if (materials[i].uniforms.envMap) {
                if (materials[i].uniforms.envMap.value != null) {
                    materials[i].uniforms.envMap.value = app.cubeMap;
                }
            }
        }
    }

    // textures
    var terrain_heightMapData = null;

    app.cubeMap = new THREE.CubeTexture;
    var terrain_colorMap = new THREE.Texture;
    var terrain_heightMap = new THREE.Texture;
    var clouds_colorMap = new THREE.TextureLoader().load('assets/terrain/clouds.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
    var tuna_colorMap = new THREE.TextureLoader().load('assets/tuna/tuna.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var tuna_jetMap = new THREE.TextureLoader().load('assets/tuna/jet.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
    var turret_colorMap = new THREE.TextureLoader().load('assets/turret/turret.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
    var skyland_colorMap = new THREE.Texture;
    var skyland_secondary = new THREE.Texture;
    var smallExplosion_colorMap = new THREE.TextureLoader().load('assets/fx/explosion.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var rocket_colorMap = new THREE.TextureLoader().load('assets/fx/rocket.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var crosshair_colorMap = new THREE.TextureLoader().load('assets/fx/crosshair.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var platform_colorMap = new THREE.Texture;
    var platform_emissiveMap = new THREE.Texture;
    var boostPortal_colorMap = new THREE.TextureLoader().load('assets/portal/boost_portal.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
    var boostPortal_emissiveMap = new THREE.TextureLoader().load('assets/portal/boost_portal_emissive.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var fighter_colorMap = new THREE.TextureLoader().load('assets/fighter/fighter.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
    var fighter_emissiveMap = new THREE.TextureLoader().load('assets/fighter/fighter_emissive.png', function () { textureLoaded(); }); app.totalTextureCount++;
    var volcano_colorMap = new THREE.Texture;
    var volcano_emissiveMap = new THREE.Texture;
    var lindworm_colorMap = new THREE.Texture;
    var lindworm_reflectionMap = new THREE.Texture;
    var lindworm_sandMap = new THREE.Texture;
    var tank_colorMap = new THREE.Texture;
    var tank_secondary = new THREE.Texture;
    var orb_colorMap = new THREE.Texture;
    var orb_secondary = new THREE.Texture;
    var asteroids_colorMap = new THREE.Texture;
    
    var lightProbe;
    var raytarget_material = new THREE.MeshBasicMaterial({ color: 0x000000, visible: false });

    // materials
    var materials = [];

    var terrain_material = app.get_terrainMaterial();
    terrain_material.name = "terrain"; materials.push(terrain_material);
    var tuna_material = app.get_phongMaterial();
    tuna_material.name = "tuna"; materials.push(tuna_material);
    var tuna_jet_material = app.get_portalMaterial();
    tuna_jet_material.name = "tuna_jet"; materials.push(tuna_jet_material);
    var skyland_material;
    var skyland_core_material;
    var skyland_highlight_material;
    var platform_material;
    var planet_material;
    var boostPortal_material = app.get_phongMaterial();
    boostPortal_material.name = "boostPortal"; materials.push(boostPortal_material);
    var boostPortal_glow_material = app.get_portalMaterial();
    boostPortal_glow_material.name = "boostPortal_glow"; materials.push(boostPortal_glow_material);

    var fighter_materials = [];
    for (let i = 0; i < app.turret_pool_size; i++) {
        let material = app.get_phongMaterial();
        material.name = "fighter";
        fighter_materials.push(material);
    }

    var onlinePlayer_materials = [];
    for (let i = 0; i < app.mp_playerLimit; i++) {
        let material = app.get_phongMaterial();
        material.name = "onlinePlayer";
        onlinePlayer_materials.push(material);
    }

    var volcano_material;
    var tank_material;
    var tank_gun_material;
    var tank_core_material;
    var tank_highlight_material;
    var lindworm_material;
    var lindworm_sand_material;

    var orb_materials = [];
    for (let i = 0; i <= 20; i++) {
        let material = app.get_phongMaterial();
        material.name = "orb";
        orb_materials.push(material);
    }

    var asteroids_material;

    var cameraCloud_material = app.get_cloudMaterial();
    cameraCloud_material.name = "cameraClouds";

    var debugCube_material = app.get_phongMaterial();
    debugCube_material.name = "debugCube"; materials.push(debugCube_material);

    var turret_materials = [];
    for (let i = 0; i < app.turret_pool_size; i++) {
        let material = app.get_phongMaterial();
        material.name = "turret";
        turret_materials.push(material);
    }

    var fog_color = new THREE.Color();
    var cloud_color = new THREE.Color();
    var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    app.scene.add(directionalLight); // add to avoid shader compilation issues
    var ambientLight;

    var cube_grasslands = ['miramar_left.png', 'miramar_right.png', 'miramar_up.png', 'miramar_down.png', 'miramar_front.png', 'miramar_back.png'];
    var cube_lava = ['violentdays_left.png', 'violentdays_right.png', 'violentdays_up.png', 'violentdays_down.png', 'violentdays_front.png', 'violentdays_back.png'];
    var cube_desert = ['interstellar_left.png', 'interstellar_right.png', 'interstellar_up.png', 'interstellar_down.png', 'interstellar_front.png', 'interstellar_back.png'];
    var cube_space = ['nebula_left.jpg', 'nebula_right.jpg', 'nebula_up.jpg', 'nebula_down.jpg', 'nebula_front.jpg', 'nebula_back.jpg'];

    app.load_stageAssets = function (stage) {
        app.scene.remove(directionalLight);
        app.scene.remove(ambientLight);

        app.dispose_texture(app.cubeMap);
        app.dispose_texture(terrain_colorMap);
        app.dispose_texture(terrain_heightMap);
        terrain_heightMapData = null;

        fileIndex = 0;
        app.assets_loadingDone = false;
        app.gltf_loadingDone = false;
        app.level_ready = false;
        app.texturesLoaded = 0;
        app.totalTextureCount = 0;

        switch (stage) {
            case app.stages.grasslands:
                if (!app.multiplayerMode) {
                    gltf_files = {
                        'platform': 'assets/platform/platform.glb',
                        'skyland': 'assets/skyland/skyland.glb'
                    }
                } else gltf_files = {};
                directionalLight = new THREE.DirectionalLight(0xffe0c3, 2.0);
                directionalLight.position.set(0.2, 1.0, 0.4);
                ambientLight = new THREE.AmbientLight(0x405479);
                app.camera.near = 0.1;
                app.camera.far = app.terrain_scaleFactor * 60;
                fog_color.set(0xe4ccc1);
                app.scene.fog = app.get_fog(fog_color, 100, app.terrain_scaleFactor * 50);
                cloud_color.set(0xfbf3f3);

                app.cubeMap = new THREE.CubeTextureLoader().setPath('assets/cubeMaps/').load([
                    cube_grasslands[0], cube_grasslands[1], cube_grasslands[2], cube_grasslands[3], cube_grasslands[4], cube_grasslands[5]],
                    function () { textureLoaded(); update_cubeMap(); }); app.totalTextureCount++;
                terrain_colorMap = new THREE.TextureLoader().load('assets/terrain/grasslands_color.jpg', function () { textureLoaded(); update_terrainTextures(); }); app.totalTextureCount++;
                terrain_heightMap = new THREE.TextureLoader().load('assets/terrain/grasslands_masks.jpg', function (texture) { textureLoaded(); terrain_heightMapData = createCanvas(texture.image); update_terrainTextures(); }); app.totalTextureCount++;
                if (!app.multiplayerMode) {
                    skyland_colorMap = new THREE.TextureLoader().load('assets/skyland/skyland.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    skyland_secondary = new THREE.TextureLoader().load('assets/skyland/skyland_secondary.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    platform_colorMap = new THREE.TextureLoader().load('assets/platform/platform.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    platform_emissiveMap = new THREE.TextureLoader().load('assets/platform/platform_emissive.png', function () { textureLoaded(); }); app.totalTextureCount++;
                }
                break;
            case app.stages.lava:
                if (!app.multiplayerMode) {
                    gltf_files = {
                        'volcano': 'assets/volcano/volcano.glb',
                        'tank': 'assets/tank/tank.glb'
                    }
                } else gltf_files = {};

                directionalLight = new THREE.DirectionalLight(0xEDC974, 2.0);
                directionalLight.position.set(0.6, 0.8, 1.0);
                ambientLight = new THREE.AmbientLight(0x995902);
                app.camera.near = 0.1;
                app.camera.far = app.terrain_scaleFactor * 60;
                fog_color.set(0x6C1005);
                app.scene.fog = app.get_fog(fog_color, 100, app.terrain_scaleFactor * 50);
                cloud_color.set(0xD36B00);

                app.cubeMap = new THREE.CubeTextureLoader().setPath('assets/cubeMaps/').load([
                    cube_lava[0], cube_lava[1], cube_lava[2], cube_lava[3], cube_lava[4], cube_lava[5]],
                    function () { textureLoaded(); update_cubeMap(); }); app.totalTextureCount++;
                terrain_colorMap = new THREE.TextureLoader().load('assets/terrain/lava_color.jpg', function () { textureLoaded(); update_terrainTextures(); }); app.totalTextureCount++;
                terrain_heightMap = new THREE.TextureLoader().load('assets/terrain/lava_masks.jpg', function (texture) { textureLoaded(); terrain_heightMapData = createCanvas(texture.image); update_terrainTextures(); }); app.totalTextureCount++;
                if (!app.multiplayerMode) {
                    volcano_colorMap = new THREE.TextureLoader().load('assets/volcano/lava_flow.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    volcano_emissiveMap = new THREE.TextureLoader().load('assets/volcano/lava_flow_emissive.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    tank_colorMap = new THREE.TextureLoader().load('assets/tank/tank.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    tank_secondary = new THREE.TextureLoader().load('assets/tank/tank_secondary.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                }
                break;
            case app.stages.desert:
                if (!app.multiplayerMode) {
                    gltf_files = {
                        'platform': 'assets/platform/platform.glb',
                        'lindworm': 'assets/lindworm/lindworm.glb'
                    }
                } else gltf_files = {};

                directionalLight = new THREE.DirectionalLight(0xEFF0DD, 2.0);
                directionalLight.position.set(0.2, 1.0, 0.4);
                ambientLight = new THREE.AmbientLight(0x836338);
                app.camera.near = 0.1;
                app.camera.far = app.terrain_scaleFactor * 60;
                fog_color.set(0xD2C190);
                app.scene.fog = app.get_fog(fog_color, 100, app.terrain_scaleFactor * 50);
                cloud_color.set(0xEDEDD7);

                app.cubeMap = new THREE.CubeTextureLoader().setPath('assets/cubeMaps/').load([
                    cube_desert[0], cube_desert[1], cube_desert[2], cube_desert[3], cube_desert[4], cube_desert[5]],
                    function () { textureLoaded(); update_cubeMap(); }); app.totalTextureCount++;
                terrain_colorMap = new THREE.TextureLoader().load('assets/terrain/desert_color.jpg', function () { textureLoaded(); update_terrainTextures(); }); app.totalTextureCount++;
                terrain_heightMap = new THREE.TextureLoader().load('assets/terrain/desert_masks.jpg', function (texture) { textureLoaded(); terrain_heightMapData = createCanvas(texture.image); update_terrainTextures(); }); app.totalTextureCount++;
                if (!app.multiplayerMode) {
                    lindworm_colorMap = new THREE.TextureLoader().load('assets/lindworm/lindworm_color.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    lindworm_reflectionMap = new THREE.TextureLoader().load('assets/lindworm/lindworm_reflection.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    lindworm_sandMap = new THREE.TextureLoader().load('assets/lindworm/sand.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    platform_colorMap = new THREE.TextureLoader().load('assets/platform/platform.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                    platform_emissiveMap = new THREE.TextureLoader().load('assets/platform/platform_emissive.png', function () { textureLoaded(); }); app.totalTextureCount++;
                }
                break;
            case app.stages.space:
                gltf_files = {
                    'orb': 'assets/orb/orb.glb',
                    'asteroids': 'assets/asteroids/asteroids.glb',
                    'planet': 'assets/planet/planet.glb'
                }

                directionalLight = new THREE.DirectionalLight(0x9DF0FF, 2.0);
                directionalLight.position.set(0.2, 1.0, 0.4);
                ambientLight = new THREE.AmbientLight(0x160B29);
                app.camera.near = 1;
                app.camera.far = 400000;
                fog_color.set(0x1C081F);
                app.scene.fog = app.get_fog(fog_color, 100000, 400000);

                app.cubeMap = new THREE.CubeTextureLoader().setPath('assets/cubeMaps/').load([
                    cube_space[0], cube_space[1], cube_space[2], cube_space[3], cube_space[4], cube_space[5]],
                    function () { textureLoaded(); update_cubeMap(); }); app.totalTextureCount++;
                orb_colorMap = new THREE.TextureLoader().load('assets/orb/orb.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                orb_secondary = new THREE.TextureLoader().load('assets/orb/orb_secondary.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                asteroids_colorMap = new THREE.TextureLoader().load('assets/asteroids/asteroids.jpg', function () { textureLoaded(); }); app.totalTextureCount++;
                break;
        }
        app.cubeMap.needsUpdate = true;
        app.load_gltf();

        // update scene lighting
        app.scene.add(directionalLight);
        app.scene.add(ambientLight);

        if (stage == app.stages.space) {
            app.terrainVisible = false;
            app.scene.remove(app.terrainObject.object);
            app.cloudsVisible = false;
        } else {
            app.terrainVisible = true;
            app.scene.add(app.terrainObject.object);
            app.cloudsVisible = true;
        }

        cameraCloud_material.uniforms.diffuse.value = cloud_color;

        app.renderer.compile(app.scene, app.camera);
        clearInterval(app.resourceLoadingCheck_interval);
        app.resourceLoadingCheck_interval = setInterval(checkLoadingStatus, 100, 'level');
    }

    function textureLoaded() {
        app.texturesLoaded++;
        // if (app.debuggenzeit) console.log('texture loaded', app.totalTextureCount, app.texturesLoaded);
    }

    app.update_shaderDefines = function () {
        // if (app.debuggenzeit) console.log('update_shaderDefines');
        terrain_material.defines.DecalShadows = app.shadowDecals_on;
        terrain_material.uniforms.decalMap.value = app.shadowFBO.texture;
        tuna_jet_material.defines.JetMode = true;

        if (app.level) {
            switch (app.level.stageIndex) {
                case app.stages.grasslands:
                    terrain_material.defines.Reflections = app.reflections_on;
                    terrain_material.defines.Emissive = false;
                    break;
                case app.stages.lava:
                    terrain_material.defines.Reflections = false;
                    terrain_material.defines.Emissive = true;
                    break;
                case app.stages.desert:
                    terrain_material.defines.Reflections = false;
                    terrain_material.defines.Emissive = false;
                    break;
            }
        }

        tuna_material.defines.Reflections = app.reflections_on;
        tuna_material.defines.DecalShadows = app.shadowDecals_on;
        tuna_material.uniforms.decalMap.value = app.shadowFBO.texture;

        if (skyland_material != null) {
            skyland_material.defines.Reflections = app.reflections_on;
            skyland_material.defines.DecalShadows = app.shadowDecals_on;
            skyland_material.defines.SecondMap = true;
            skyland_material.uniforms.decalMap.value = app.shadowFBO.texture;
            skyland_core_material.defines.Reflections = app.reflections_on;
            skyland_core_material.defines.SecondMap = true;
            skyland_core_material.defines.Highlight = true;
            skyland_highlight_material.defines.Reflections = app.reflections_on;
            skyland_highlight_material.defines.Highlight = true;
            skyland_highlight_material.defines.SecondMap = true;
        }

        if (platform_material != null) {
            platform_material.defines.DecalShadows = app.shadowDecals_on;
            platform_material.defines.EmissiveMap = true;
            platform_material.uniforms.decalMap.value = app.shadowFBO.texture;
        }
        boostPortal_material.defines.EmissiveMap = true;

        for (let i = 0; i < fighter_materials.length; i++) {
            fighter_materials[i].defines.EmissiveMap = true;
        }

        if (volcano_material != null) {
            volcano_material.defines.DecalShadows = app.shadowDecals_on;
            volcano_material.defines.EmissiveMap = true;
            volcano_material.defines.TextureShift = true;
        }

        if (planet_material != null) planet_material.defines.Halo = true;

        if (tank_material != null) {
            tank_material.defines.Reflections = app.reflections_on;
            tank_material.defines.DecalShadows = app.shadowDecals_on;
            tank_material.uniforms.decalMap.value = app.shadowFBO.texture;
            tank_material.defines.SecondMap = true;
            tank_gun_material.defines.Reflections = app.reflections_on;
            tank_gun_material.defines.DecalShadows = app.shadowDecals_on;
            tank_gun_material.uniforms.decalMap.value = app.shadowFBO.texture;
            tank_gun_material.defines.SecondMap = true;
            tank_core_material.defines.Reflections = app.reflections_on;
            tank_core_material.defines.Highlight = true;
            tank_core_material.defines.SecondMap = true;
            tank_highlight_material.defines.Reflections = app.reflections_on;
            tank_highlight_material.defines.Highlight = true;
            tank_highlight_material.defines.SecondMap = true;
        }

        if (lindworm_material != null) lindworm_material.defines.Reflections = app.reflections_on;

        for (let i = 0; i < orb_materials.length; i++) {
            orb_materials[i].defines.Reflections = app.reflections_on;
            orb_materials[i].defines.SecondMap = true;
        }

        debugCube_material.defines.Reflections = app.reflections_on;
        debugCube_material.defines.DecalShadows = app.shadowDecals_on;
        debugCube_material.uniforms.decalMap.value = app.shadowFBO.texture;

        for (let i = 0; i < turret_materials.length; i++) {
            turret_materials[i].defines.DecalShadows = app.shadowDecals_on;
            turret_materials[i].uniforms.decalMap.value = app.shadowFBO.texture;
        }

        app.renderer.compile(app.shadowScene, app.shadowCamera);
        app.renderer.compile(app.scene, app.camera);
    }

    app.get_background = function () {
        return app.cubeMap;
    }

    app.get_cameraClouds = function () {
        var cloud_geometry = new THREE.PlaneBufferGeometry();
        var plane = new THREE.Mesh(cloud_geometry, cameraCloud_material);

        cameraCloud_material.uniforms.colorMap.value = clouds_colorMap;
        cameraCloud_material.uniforms.gain.value = 0.5;
        cameraCloud_material.uniforms.colorMap.value.wrapS = cameraCloud_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        clouds_colorMap.needsUpdate = true;
        var scale = 100;
        plane.scale.set(scale, scale, scale);

        return plane;
    }

    app.get_lightprobe = function () {
        lightProbe = new THREE.LightProbe();
        lightProbe.copy(new THREE.LightProbeGenerator.fromCubeTexture(app.cubeMap));
        lightProbe.intensity = 1.2;
        return lightProbe;
    }

    app.get_fog = function (color, near, far) {
        let fog = new THREE.Fog(color, near, far);
        return fog;
    }

    app.get_cube = function (size, color, collision) {
        let geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        let material = new THREE.MeshBasicMaterial({ color: color });
        let cube = new THREE.Mesh(geometry, material);
        let rayMesh = null;
        if (collision == true) {
            rayMesh = cube.clone();
            rayMesh.material = raytarget_material;
            rayMesh.name = 'cube_raytarget';
            cube.add(rayMesh);
        }

        return {
            object: cube,
            rayMesh: rayMesh,
            material: material
        };
    }

    app.get_plane = function (size, color, material) {
        let geometry = new THREE.PlaneGeometry(size[0], size[1]);
        let planeMaterial;
        if (material) {
            planeMaterial = material;
        } else {
            planeMaterial = new THREE.MeshBasicMaterial({ color: color });
        }
        let plane = new THREE.Mesh(geometry, planeMaterial);

        return plane;
    }

    app.get_rocket = function (color) {
        var material = app.get_rocketMaterial();
        material.uniforms.colorMap.value = rocket_colorMap;
        material.uniforms.diffuse.value = color;
        let rocket = app.get_plane([12, 12], color, material);
        return rocket;
    }

    function create_geometryInstances(geometry, material, count) {
        let meshes = new THREE.InstancedMesh(geometry, material, count);
        return meshes;
    }

    function create_mirroredGeometryInstance(mesh, material) {
        var clone = new THREE.InstancedMesh(mesh.geometry, material, 1);
        clone.position.copy(mesh.position);
        clone.scale.x = -1;
        return clone;
    }

    var nameA;
    var nameB;
    function sortByName(objectAray) {
        objectAray.sort(function (a, b) {
            nameA = a.name.toUpperCase(); // ignore upper and lowercase
            nameB = b.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            // names must be equal
            return 0;
        });
    }

    function get_terrain() {
        let object = {};
        let terrain_scene = app.gltf_scenes['terrain_ground'];
        let terrain = terrain_scene.children[0];
        object.object = terrain;
        let terrain_mesh = terrain.children[0];

        let rayMesh = terrain.children[1];
        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        rayMesh.material = raytarget_material;
        object.rayMesh = rayMesh;

        object.colorMap = terrain_colorMap;
        object.heightMap = terrain_heightMap;
        object.heightMapData = terrain_heightMapData;

        terrain_material.uniforms.envMap.value = app.cubeMap;

        terrain_mesh.material = terrain_material;
        let clone = create_mirroredGeometryInstance(terrain_mesh, terrain_material);
        terrain.add(clone);

        object.material = terrain_material;

        terrain.scale.set(app.terrain_scaleFactor, app.terrainHeight, app.terrain_scaleFactor);

        return object;
    }

    function get_tuna() {
        let scene = app.gltf_scenes['tuna'];
        let group = new THREE.Group();
        group.name = 'tuna';
        let object = scene.children[0].clone();
        sortByName(object.children);
        let ship = object.children[0];
        let wings = object.children[1];
        let top_fin = object.children[2];
        let rear_fin = object.children[3];
        let rotor = object.children[4];
        let rotor_hub_mesh = rotor.children[0];
        let rotor_blades_mesh = rotor.children[1];
        let wing_jet = object.children[5];
        let jet = object.children[6];
        let jet_mount = jet.children[0];
        let jet_jet = jet.children[1];

        tuna_material.uniforms.envMap.value = app.cubeMap;
        tuna_material.uniforms.colorMap.value = tuna_colorMap;
        tuna_material.uniforms.decal_channels.value = app.decalChannels.ships_tunnels;

        tuna_jet_material.uniforms.colorMap.value = tuna_jetMap;
        tuna_jet_material.uniforms.colorMap.value.wrapS = tuna_jet_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        tuna_jet_material.uniforms.diffuse.value = new THREE.Color(0x7d54e7);

        group.add(ship);
        group.add(wings);
        group.add(top_fin);
        group.add(rear_fin);
        group.add(rotor);
        group.add(wing_jet);
        group.add(jet);

        ship.material = tuna_material;
        wings.material = tuna_material;
        top_fin.material = tuna_material;
        rear_fin.material = tuna_material;
        rotor_hub_mesh.material = tuna_material;
        wing_jet.children[0].material = tuna_material;
        wing_jet.children[1].material = tuna_jet_material;
        jet_mount.material = tuna_material;
        jet_jet.children[0].material = tuna_material;
        jet_jet.children[1].material = tuna_jet_material;
        let material_blades = new THREE.MeshBasicMaterial({
            map: tuna_colorMap,
            transparent: true,
            alphaMap: tuna_colorMap,
            fog: true
        });
        rotor_blades_mesh.material = material_blades;

        let rocketLauncher = new THREE.Group();
        rocketLauncher.position.copy(ship.position);
        rocketLauncher.position.add(new THREE.Vector3(0, 0, -20));
        group.add(rocketLauncher);

        var crosshair_material = app.get_particleMaterial();
        crosshair_material.uniforms.colorMap.value = crosshair_colorMap;
        crosshair_material.uniforms.diffuse.value = app.color_green;
        var crosshair_geometry = new THREE.PlaneBufferGeometry();
        var crosshair = new THREE.Mesh(crosshair_geometry, crosshair_material);
        crosshair.scale.set(100, 100, 1);
        crosshair.position.z = 200;
        rocketLauncher.add(crosshair);
        crosshair.visible = false;

        return { ship: group, rotor: rotor, wings: wings, top_fin: top_fin, rear_fin: rear_fin, wing_jet: wing_jet, jet: jet, material: tuna_material, jet_material: tuna_jet_material, rocketLauncher: rocketLauncher, crosshair: crosshair };
    }

    app.get_turret = function (index) {
        let scene = app.gltf_scenes['turret'];
        let group = new THREE.Group();
        group.name = 'turret';
        let object = scene.children[0].clone();
        sortByName(object.children);
        let base = object.children[0];
        let pivot = object.children[1];
        let gun = object.children[2];

        turret_materials[index].uniforms.colorMap.value = turret_colorMap;
        turret_materials[index].uniforms.decal_channels.value = app.decalChannels.all;

        base.material = turret_materials[index];
        pivot.material = turret_materials[index];
        gun.material = turret_materials[index];

        group.add(base);
        group.add(pivot);
        pivot.add(gun);
        return { object: group, base: base, pivot: pivot, gun: gun, material: turret_materials[index] }
    }

    app.get_platform = function () {
        // if platform object exists
        if (app.platformObject != null) {
            return app.platformObject;
        }

        let scene = app.gltf_scenes['platform'];
        let group = new THREE.Group();
        group.name = 'platform';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let light_root = object.children[1];
        let rayMesh = object.children[2];

        platform_material = app.get_phongMaterial();
        platform_material.name = "platform"; materials.push(platform_material);
        platform_material.uniforms.colorMap.value = platform_colorMap;
        platform_material.uniforms.emissiveMap.value = platform_emissiveMap;
        platform_material.uniforms.emissive_channel.value = 0;
        mesh.material = platform_material;

        group.add(mesh);
        group.add(light_root);

        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        rayMesh.material = raytarget_material;
        rayMesh.name = 'destination_raytarget';
        group.add(rayMesh);

        return { object: group, mesh: mesh, rayMesh: rayMesh, material: platform_material, light: light_root }
    }

    app.get_volcano = function () {
        // if volcano object exists
        if (app.volcanoObject != null) {
            return app.volcanoObject;
        }

        let scene = app.gltf_scenes['volcano'];
        let group = new THREE.Group();
        group.name = 'volcano';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let rayMesh = object.children[1];

        volcano_material = app.get_phongMaterial();
        volcano_material.name = "volcano"; materials.push(volcano_material);
        volcano_material.uniforms.colorMap.value = volcano_colorMap;
        volcano_material.uniforms.colorMap.value.wrapS = volcano_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        volcano_material.uniforms.emissiveMap.value = volcano_emissiveMap;
        volcano_material.uniforms.emissiveMap.value.wrapS = volcano_material.uniforms.emissiveMap.value.wrapT = THREE.RepeatWrapping;
        volcano_material.uniforms.emissive_channel.value = 0;

        mesh.material = volcano_material;

        group.add(mesh);

        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        rayMesh.material = raytarget_material;
        rayMesh.name = 'volcano_raytarget';
        group.add(rayMesh);

        return { object: group, mesh: mesh, rayMesh: rayMesh, material: volcano_material }
    }

    app.get_planet = function () {
        // if planet object exists
        if (app.planetObject != null) {
            return app.planetObject;
        }

        let scene = app.gltf_scenes['planet'];
        let group = new THREE.Group();
        group.name = 'planet';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];

        planet_material = app.get_phongMaterial();
        planet_material.name = "planet"; materials.push(planet_material);
        planet_material.uniforms.colorMap.value = asteroids_colorMap;
        planet_material.uniforms.haloColor.value = new THREE.Color(0x00CCF0);
        mesh.material = planet_material;

        group.add(mesh);

        return { object: group, mesh: mesh, material: planet_material }
    }

    app.dispose_destination = function () {
        console.log('dispose_destination');
        if (app.destination != null) {
            app.deactivate_destination();
            app.dispose_geometry(app.destination.asset.object);
            app.destination = null;
            if (app.platformObject != null) {
                app.platformObject = null;
                app.gltf_scenes['platform'] = null;
                app.dispose_material(platform_material);
                app.dispose_texture(platform_colorMap);
                app.dispose_texture(platform_emissiveMap);
            }
            if (app.volcanoObject != null) {
                app.volcanoObject = null;
                app.gltf_scenes['volcano'] = null;
                app.dispose_material(volcano_material);
                app.dispose_texture(volcano_colorMap);
                app.dispose_texture(volcano_emissiveMap);
            }
            if (app.planetObject != null) {
                app.planetObject = null;
                app.gltf_scenes['planet'] = null;
                app.dispose_material(planet_material);
            }
        }
    }

    app.get_lindworm = function () {
        // if lindworm object exists
        if (app.lindwormObject != null) {
            return app.lindwormObject;
        }

        let scene = app.gltf_scenes['lindworm'];
        let group = new THREE.Group();
        group.name = 'lindworm';
        let pivot = new THREE.Group();
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let drill = object.children[1];
        let rayMesh = object.children[2];
        let rocketLaunchers = object.children[3];

        lindworm_material = app.get_lindwormMaterial();
        lindworm_material.name = "lindworm"; materials.push(lindworm_material);
        lindworm_material.uniforms.envMap.value = app.cubeMap;
        lindworm_material.uniforms.colorMap.value = lindworm_colorMap;
        lindworm_material.uniforms.reflectionMap.value = lindworm_reflectionMap;

        lindworm_sand_material = app.get_lindworm_sandMaterial();
        lindworm_sand_material.name = "lindworm_sand"; materials.push(lindworm_sand_material);
        lindworm_sand_material.uniforms.colorMap.value = lindworm_sandMap;
        lindworm_sand_material.uniforms.colorMap.value.wrapS = lindworm_sand_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        lindworm_sand_material.uniforms.diffuse.value = app.color_sand;

        mesh.children[0].material = lindworm_material;
        mesh.children[1].material = lindworm_sand_material;
        drill.material = lindworm_material;

        group.add(pivot);
        pivot.add(mesh);
        pivot.add(drill);
        pivot.add(rocketLaunchers);

        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        rayMesh.material = raytarget_material;
        rayMesh.name = 'boss_raytarget';
        pivot.add(rayMesh);

        return { object: group, pivot: pivot, mesh: mesh, drill: drill, rocketLaunchers: rocketLaunchers, rayMesh: rayMesh, material: lindworm_material, sandMaterial: lindworm_sand_material }
    }

    app.get_asteroids = function () {
        // if asteroids object exists
        if (app.asteroidsObject != null) {
            return app.asteroidsObject;
        }

        let scene = app.gltf_scenes['asteroids'];
        let group = new THREE.Group();
        group.name = 'asteroids';
        let object = scene.children[0];
        sortByName(object.children);

        let asteroids = [object.children[0], object.children[1], object.children[2]];
        let rayMeshes = [object.children[0].clone(), object.children[1].clone(), object.children[2].clone()];

        asteroids_material = new THREE.MeshLambertMaterial();
        asteroids_material.map = asteroids_colorMap;
        asteroids_material.color = app.color_asteroid;

        return { object: group, asteroids: asteroids, rayMeshes: rayMeshes, material: asteroids_material, colorMap: asteroids_colorMap }
    }

    app.get_orb = function () {
        // if orb object exists
        if (app.orbObject != null) {
            return app.orbObject;
        }

        let scene = app.gltf_scenes['orb'];
        let group = new THREE.Group();
        group.name = 'orb';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let doors_parent = object.children[1];
        let doors = doors_parent.children;
        let gun = object.children[2];
        let rocketLaunchers = object.children[3];
        let gun_rayMesh = object.children[4];
        let rayMesh = object.children[5];
        let crystal_rayMesh = object.children[6];

        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        rayMesh.material = raytarget_material;
        rayMesh.name = 'boss_shell_raytarget';
        group.add(rayMesh);

        crystal_rayMesh.geometry = app.bufferGeometry2geometry(crystal_rayMesh.geometry);
        crystal_rayMesh.material = raytarget_material;
        crystal_rayMesh.name = 'boss_raytarget';
        group.add(crystal_rayMesh);

        for (let i = 0; i < orb_materials.length; i++) {
            orb_materials[i].uniforms.envMap.value = app.cubeMap;
            orb_materials[i].uniforms.colorMap.value = orb_colorMap;
            orb_materials[i].uniforms.secondMap.value = orb_secondary;
        }

        orb_materials[rocketLaunchers.children.length].uniforms.colorMap.value.wrapS = orb_materials[rocketLaunchers.children.length].uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        mesh.children[0].material = orb_materials[rocketLaunchers.children.length];
        mesh.children[1].material = orb_materials[rocketLaunchers.children.length + 1];

        doors[0].children[0].material = doors[1].children[0].material = doors[2].children[0].material = orb_materials[rocketLaunchers.children.length];

        // add guns
        let guns = [];
        gun.position.set(0.0, 0.0, 0.0);
        gun.rotation.set(0.0, 0.0, 0.0);
        gun_rayMesh.position.set(0.0, 0.0, 0.0);
        gun_rayMesh.rotation.set(0.0, 0.0, 0.0);

        gun_rayMesh.geometry = app.bufferGeometry2geometry(gun_rayMesh.geometry);
        gun_rayMesh.material = raytarget_material;
        gun_rayMesh.name = 'boss_gun_raytarget';

        for (let i = 0; i < rocketLaunchers.children.length; i++) {
            let clone = gun.clone();
            clone.name = i;
            clone.material = orb_materials[i];

            let rayMesh = gun_rayMesh.clone();
            clone.add(rayMesh);

            let gun_object = {
                active: false,
                health: 30,
                mesh: clone,
                rayMesh: rayMesh,
                parent: rocketLaunchers.children[i],
            };
            guns.push(gun_object);
        }

        // doors
        for (let i = 0; i < doors.length; i++) {
            var door_rayMesh = doors[i].children[0].clone();
            door_rayMesh.geometry = app.bufferGeometry2geometry(door_rayMesh.geometry);
            door_rayMesh.name = 'boss_door_raytarget';

            door_rayMesh.position.set(0, 0, 0);
            door_rayMesh.rotation.set(0, 0, 0);

            doors[i].children[0].add(door_rayMesh);
        }

        group.add(mesh);
        group.add(doors_parent);
        group.add(rocketLaunchers);

        return { object: group, mesh: mesh, rayMesh: rayMesh, crystal_rayMesh: crystal_rayMesh, guns: guns, rocketLaunchers: rocketLaunchers, doors: doors, material: orb_materials[rocketLaunchers.children.length + 1], materials: orb_materials }
    }


    app.dispose_boss = function () {
        console.log('dispose_boss');
        if (app.boss != null) {
            app.deactivate_boss();
            app.dispose_geometry(app.boss.asset.object);
            app.boss = null;
            if (app.lindwormObject != null) {
                app.lindwormObject = null;
                app.gltf_scenes['lindworm'] = null;
                app.dispose_material(lindworm_material);
                app.dispose_material(lindworm_sand_material);
                app.dispose_texture(lindworm_colorMap);
                app.dispose_texture(lindworm_reflectionMap);
                app.dispose_texture(lindworm_sandMap);
            }
            if (app.orbObject != null) {
                app.gltf_scenes['orb'] = null;
                for (let i = 0; i < app.orbObject.guns.length; i++) {
                    app.dispose_geometry(app.orbObject.guns[i].mesh);
                }
                for (let i = 0; i < app.orbObject.doors.length; i++) {
                    app.dispose_geometry(app.orbObject.doors[i]);
                }
                app.orbObject = null;
                for (let i = 0; i < orb_materials.length; i++) {
                    app.dispose_material(orb_materials[i]);
                }
                app.dispose_texture(orb_colorMap);
                app.dispose_texture(orb_secondary);
            }
        }
    }

    app.get_tank = function () {
        // if tank object exists
        if (app.tankObject != null) {
            return app.tankObject;
        }

        let scene = app.gltf_scenes['tank'];
        let group = new THREE.Group();
        group.name = 'tank';
        let chassis = new THREE.Group();
        let wheel_fl = new THREE.Group();
        let wheel_fr = new THREE.Group();
        let wheel_rl = new THREE.Group();
        let wheel_rr = new THREE.Group();

        let wheel_fl_rayOrigin = new THREE.Group();
        let wheel_fr_rayOrigin = new THREE.Group();
        let wheel_rl_rayOrigin = new THREE.Group();
        let wheel_rr_rayOrigin = new THREE.Group();

        let core_group = new THREE.Group();
        core_group.position.set(0, -50, -130);
        let doors_front_group = new THREE.Group();
        doors_front_group.position.set(0, -50, -130);

        let object = scene.children[0];
        sortByName(object.children);
        // console.log(object.children[10]);
        let front = object.children[0];
        let rear = object.children[1];
        let gun_pivot = object.children[2];
        let gun = object.children[3];
        let rocketLauncher = new THREE.Group();
        let core_mesh = object.children[6];
        let core_rayMesh = object.children[11];
        let door_front_mesh = object.children[7];
        let door_front_rayMesh = object.children[12];

        let suspension_fl_mesh = object.children[4];
        suspension_fl_mesh.position.set(0, 0, 0);
        let suspension_fr_mesh = suspension_fl_mesh.clone();
        let suspension_rl_mesh = suspension_fl_mesh.clone();
        let suspension_rr_mesh = suspension_fl_mesh.clone();

        let wheel_fl_mesh = object.children[5];
        wheel_fl_mesh.position.set(0, 0, 0);
        let wheel_fr_mesh = wheel_fl_mesh.clone();
        let wheel_rl_mesh = wheel_fl_mesh.clone();
        let wheel_rr_mesh = wheel_fl_mesh.clone();
        let front_rayMesh = object.children[8];
        let rear_rayMesh = object.children[9];
        let gun_rayMesh = object.children[10];

        tank_material = app.get_phongMaterial();
        tank_material.name = "tank"; materials.push(tank_material);
        tank_gun_material = app.get_phongMaterial();
        tank_gun_material.name = "tank_gun"; materials.push(tank_gun_material);
        tank_core_material = app.get_phongMaterial();
        tank_core_material.name = "tank_core"; materials.push(tank_core_material);
        tank_highlight_material = app.get_phongMaterial();
        tank_highlight_material.name = "tank_highlight"; materials.push(tank_highlight_material);

        tank_material.uniforms.envMap.value = tank_gun_material.uniforms.envMap.value = tank_core_material.uniforms.envMap.value = tank_highlight_material.uniforms.envMap.value = app.cubeMap;
        tank_material.uniforms.colorMap.value = tank_gun_material.uniforms.colorMap.value = tank_core_material.uniforms.colorMap.value = tank_highlight_material.uniforms.colorMap.value = tank_colorMap;
        tank_material.uniforms.secondMap.value = tank_gun_material.uniforms.secondMap.value = tank_core_material.uniforms.secondMap.value = tank_gun_material.uniforms.secondMap.value = tank_highlight_material.uniforms.secondMap.value = tank_secondary;
        tank_material.uniforms.decal_channels.value = tank_gun_material.uniforms.decal_channels.value = tank_highlight_material.uniforms.decal_channels.value = app.decalChannels.player;

        tank_material.uniforms.colorMap.value.wrapS = tank_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        tank_gun_material.uniforms.colorMap.value.wrapS = tank_gun_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        tank_highlight_material.uniforms.colorMap.value.wrapS = tank_highlight_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;

        front.material = rear.material
            = suspension_fl_mesh.material = suspension_fr_mesh.material = suspension_rl_mesh.material = suspension_rr_mesh.material
            = wheel_fl_mesh.material = wheel_fr_mesh.material = wheel_rl_mesh.material = wheel_rr_mesh.material
            = tank_material;

        gun_pivot.material = gun.material = tank_gun_material;
        core_mesh.material = tank_core_material;
        door_front_mesh.material = tank_highlight_material;

        gun.add(rocketLauncher);
        gun_pivot.add(gun);
        front.add(gun_pivot);
        chassis.add(front);
        chassis.add(rear);
        core_group.add(core_mesh);
        core_group.add(core_rayMesh);
        front.add(core_group);
        doors_front_group.add(door_front_mesh);
        doors_front_group.add(door_front_rayMesh);
        front.add(doors_front_group);

        wheel_fl.add(suspension_fl_mesh);
        wheel_fr.add(suspension_fr_mesh);
        wheel_rl.add(suspension_rl_mesh);
        wheel_rr.add(suspension_rr_mesh);
        suspension_fl_mesh.add(wheel_fl_mesh);
        suspension_fr_mesh.add(wheel_fr_mesh);
        suspension_rl_mesh.add(wheel_rl_mesh);
        suspension_rr_mesh.add(wheel_rr_mesh);

        group.add(chassis);
        group.add(wheel_fl);
        group.add(wheel_fr);
        group.add(wheel_rl);
        group.add(wheel_rr);
        group.add(wheel_fl_rayOrigin);
        group.add(wheel_fr_rayOrigin);
        group.add(wheel_rl_rayOrigin);
        group.add(wheel_rr_rayOrigin);

        front.position.z = 130;
        gun_pivot.position.set(0, 50, -20);
        gun.position.set(0, 20, -10);
        rocketLauncher.position.set(0, 8, 100);
        rear.position.z = -70;
        wheel_fl.position.set(60, 0, 130);
        wheel_fr.position.set(-60, 0, 130);
        wheel_rl.position.set(60, 0, -85);
        wheel_rr.position.set(-60, 0, -85);

        wheel_fl_rayOrigin.position.set(60, 50, 130);
        wheel_fr_rayOrigin.position.set(-60, 50, 130);
        wheel_rl_rayOrigin.position.set(60, 50, -85);
        wheel_rr_rayOrigin.position.set(-60, 50, -85);

        wheel_fr.scale.x = -1;
        wheel_rr.scale.x = -1;

        let front_clone = create_mirroredGeometryInstance(front, tank_material);
        front_clone.position.set(0, 0, 0);
        front.add(front_clone);
        let rear_clone = create_mirroredGeometryInstance(rear, tank_material);
        rear_clone.position.set(0, 0, 0);
        rear.add(rear_clone);

        front_rayMesh.geometry = app.bufferGeometry2geometry(front_rayMesh.geometry);
        rear_rayMesh.geometry = app.bufferGeometry2geometry(rear_rayMesh.geometry);
        gun_rayMesh.geometry = app.bufferGeometry2geometry(gun_rayMesh.geometry);
        core_rayMesh.geometry = app.bufferGeometry2geometry(core_rayMesh.geometry);
        door_front_rayMesh.geometry = app.bufferGeometry2geometry(door_front_rayMesh.geometry);
        front_rayMesh.material
            = rear_rayMesh.material
            = gun_rayMesh.material
            = core_rayMesh.material
            = door_front_rayMesh.material
            = raytarget_material;
        front_rayMesh.name = rear_rayMesh.name = 'fortress_raytarget';
        gun_rayMesh.name = 'fortress_turret_raytarget';
        core_rayMesh.name = 'fortress_core_raytarget';
        door_front_rayMesh.name = 'fortress_doors_raytarget';
        front.add(front_rayMesh);
        rear.add(rear_rayMesh);
        gun_pivot.add(gun_rayMesh);

        front_rayMesh.position.set(0, 0, 0);
        rear_rayMesh.position.set(0, 0, 0);
        gun_rayMesh.position.set(0, 0, 0);


        return {
            object: group,
            chassis: chassis,
            front: front,
            rear: rear,
            gun_pivot: gun_pivot,
            gun: gun,
            front_rayMesh: front_rayMesh,
            rear_rayMesh: rear_rayMesh,
            gun_rayMesh: gun_rayMesh,
            rocketLauncher: rocketLauncher,
            wheel_meshs: [wheel_fl_mesh, wheel_fr_mesh, wheel_rl_mesh, wheel_rr_mesh],
            wheels: [wheel_fl, wheel_fr, wheel_rl, wheel_rr],
            wheel_rayOrigins: [wheel_fl_rayOrigin, wheel_fr_rayOrigin, wheel_rl_rayOrigin, wheel_rr_rayOrigin],
            material: tank_material,
            gun_material: tank_gun_material,
            highlight_material: tank_highlight_material,
            core_group: core_mesh,
            core_rayMesh: core_rayMesh,
            core_material: tank_core_material,
            doors_front_group: doors_front_group,
            door_front_rayMesh: door_front_rayMesh
        }
    }

    app.get_boostPortal = function () {
        let scene = app.gltf_scenes['boostPortal'];
        let group = new THREE.Group();
        group.name = 'boostPortal';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let gear_big = object.children[1];
        let gears_small = object.children[2];

        boostPortal_material.uniforms.colorMap.value = boostPortal_colorMap;
        boostPortal_material.uniforms.emissiveMap.value = boostPortal_emissiveMap;
        boostPortal_material.uniforms.emissive_channel.value = 0;
        boostPortal_glow_material.uniforms.colorMap.value = boostPortal_colorMap;
        boostPortal_glow_material.uniforms.colorMap.value.wrapS = boostPortal_glow_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        boostPortal_colorMap.needsUpdate = true;
        boostPortal_glow_material.uniforms.diffuse.value = new THREE.Color(0x7d54e7);
        mesh.material = boostPortal_material;
        gear_big.children[0].material = boostPortal_material;
        gear_big.children[1].material = boostPortal_glow_material;
        for (let i = 0; i < gears_small.children.length; i++) {
            gears_small.children[i].material = boostPortal_material;
        }

        group.add(mesh);
        group.add(gear_big);
        group.add(gears_small);

        return { object: group, mesh: mesh, gear_big: gear_big, gears_small: gears_small, material: boostPortal_material, glow_material: boostPortal_glow_material }
    }

    app.get_fighter = function (index) {
        let scene = app.gltf_scenes['fighter'];
        let group = new THREE.Group();
        let innerGroup = new THREE.Group();
        group.name = 'fighter';
        let object = scene.children[0].clone();
        sortByName(object.children);
        let mesh = object.children[0];
        let propeller_mesh = object.children[2];
        let propeller_roots = object.children[3];

        fighter_materials[index].uniforms.colorMap.value = fighter_colorMap;
        fighter_materials[index].uniforms.emissiveMap.value = fighter_emissiveMap;
        fighter_materials[index].uniforms.emissive_channel.value = 0;
        mesh.material = fighter_materials[index];

        let material_blades = new THREE.MeshBasicMaterial({
            map: fighter_colorMap,
            transparent: true,
            alphaMap: fighter_colorMap,
            fog: true
        });

        propeller_mesh.material = material_blades;

        group.add(innerGroup);
        innerGroup.add(mesh);
        innerGroup.add(propeller_roots);

        // add propellers
        let propellers = [];

        for (let i = 0; i < propeller_roots.children.length; i++) {
            let clone = propeller_mesh.clone();
            clone.position.set(0.0, 0.0, 0.0);
            propeller_roots.children[i].add(clone);
            propellers.push(clone);
        }

        return { object: group, mesh: mesh, material: fighter_materials[index], propellers: propellers }
    }

    app.get_onlinePlayer = function (index) {
        let scene = app.gltf_scenes['tuna'];
        let group = new THREE.Group();
        group.name = 'onlinePlayer';
        let object = scene.children[0].clone();
        sortByName(object.children);
        let ship = object.children[0];
        let wings = object.children[1];
        let top_fin = object.children[2];
        let rear_fin = object.children[3];
        let rotor = object.children[4];
        let rotor_hub_mesh = rotor.children[0];
        let rotor_blades_mesh = rotor.children[1];

        onlinePlayer_materials[index].defines.Reflections = app.reflections_on;

        onlinePlayer_materials[index].uniforms.colorMap.value = tuna_colorMap;
        onlinePlayer_materials[index].uniforms.envMap.value = app.cubeMap;

        group.add(ship);
        group.add(wings);
        group.add(top_fin);
        group.add(rear_fin);
        group.add(rotor);

        ship.material = onlinePlayer_materials[index];
        wings.material = onlinePlayer_materials[index];
        top_fin.material = onlinePlayer_materials[index];
        rear_fin.material = onlinePlayer_materials[index];
        rotor_hub_mesh.material = onlinePlayer_materials[index];
        let material_blades = new THREE.MeshBasicMaterial({
            map: tuna_colorMap,
            transparent: true,
            alphaMap: tuna_colorMap,
            fog: true
        });
        rotor_blades_mesh.material = material_blades;

        let rocketLauncher = new THREE.Group();
        rocketLauncher.position.copy(ship.position);
        rocketLauncher.position.add(new THREE.Vector3(0, 0, 15));
        group.add(rocketLauncher);

        return { object: group, rotor: rotor, wings: wings, top_fin: top_fin, rear_fin: rear_fin, material: onlinePlayer_materials[index], rocketLauncher: rocketLauncher }
    }

    app.get_skyland = function () {
        let scene = app.gltf_scenes['skyland'];
        let group = new THREE.Group();
        let core_group = new THREE.Group();
        let doors_front_group = new THREE.Group();
        let doors_rear_group = new THREE.Group();
        let turret_group = new THREE.Group();
        group.name = 'skyland';
        let object = scene.children[0];
        sortByName(object.children);
        let mesh = object.children[0];
        let rayMesh = object.children[1];
        let movingParts = object.children[2];
        let turret_roots = object.children[3];
        let propeller_roots = object.children[4];
        let smallPropeller_roots = object.children[5];
        let cog_roots = object.children[6];
        let triggers_parent = object.children[7];

        sortByName(movingParts.children);
        let cog_mesh = movingParts.children[0];
        let core_mesh = movingParts.children[1];
        let core_rayMesh = movingParts.children[2];
        let door_front_mesh = movingParts.children[3];
        let door_front_rayMesh = movingParts.children[4];
        let door_rear_mesh = movingParts.children[5];
        let door_rear_rayMesh = movingParts.children[6];
        let propeller_mesh = movingParts.children[7];
        let smallPropeller_mesh = movingParts.children[8];
        group.add(mesh);
        group.add(propeller_roots);
        group.add(smallPropeller_roots);
        group.add(cog_roots);

        group.add(core_group);
        core_group.add(core_mesh);
        core_group.add(core_rayMesh);

        group.add(doors_front_group);
        doors_front_group.add(door_front_mesh);
        doors_front_group.add(door_front_rayMesh);

        group.add(doors_rear_group);
        doors_rear_group.add(door_rear_mesh);
        doors_rear_group.add(door_rear_rayMesh);

        skyland_material = app.get_phongMaterial();
        skyland_material.name = "fortress"; materials.push(skyland_material);
        skyland_core_material = app.get_phongMaterial();
        skyland_core_material.name = "skyland_core"; materials.push(skyland_core_material);
        skyland_highlight_material = app.get_phongMaterial();
        skyland_highlight_material.name = "skyland_highlight"; materials.push(skyland_highlight_material);

        skyland_material.uniforms.envMap.value = app.cubeMap;
        skyland_material.uniforms.colorMap.value = skyland_highlight_material.uniforms.colorMap.value = skyland_core_material.uniforms.colorMap.value = skyland_colorMap;
        skyland_material.uniforms.colorMap.value.wrapS = skyland_material.uniforms.colorMap.value.wrapT = THREE.RepeatWrapping;
        skyland_material.uniforms.secondMap.value = skyland_highlight_material.uniforms.secondMap.value = skyland_core_material.uniforms.secondMap.value = skyland_secondary;

        skyland_material.uniforms.decal_channels.value = skyland_highlight_material.uniforms.decal_channels.value = app.decalChannels.player;

        mesh.material = skyland_material;
        cog_mesh.material = skyland_material;
        propeller_mesh.material = skyland_material;
        smallPropeller_mesh.material = skyland_material;

        core_mesh.material = skyland_core_material;
        door_front_mesh.material = skyland_highlight_material;
        door_rear_mesh.material = skyland_highlight_material;

        let door_front_clone = create_mirroredGeometryInstance(door_front_mesh, skyland_highlight_material);
        doors_front_group.add(door_front_clone);
        let door_rear_clone = create_mirroredGeometryInstance(door_rear_mesh, skyland_highlight_material);
        doors_rear_group.add(door_rear_clone);

        let mesh_clone = create_mirroredGeometryInstance(mesh, skyland_material);
        group.add(mesh_clone);

        rayMesh.geometry = app.bufferGeometry2geometry(rayMesh.geometry);
        core_rayMesh.geometry = app.bufferGeometry2geometry(core_rayMesh.geometry);
        door_front_rayMesh.geometry = app.bufferGeometry2geometry(door_front_rayMesh.geometry);
        door_rear_rayMesh.geometry = app.bufferGeometry2geometry(door_rear_rayMesh.geometry);

        rayMesh.material = raytarget_material;
        core_rayMesh.material = raytarget_material;
        door_front_rayMesh.material = raytarget_material;
        door_rear_rayMesh.material = raytarget_material;

        rayMesh.name = 'fortress_raytarget';
        core_rayMesh.name = 'fortress_core_raytarget';
        door_front_rayMesh.name = door_rear_rayMesh.name = 'fortress_doors_raytarget';
        group.add(rayMesh);

        let triggers = { tunnel_front: triggers_parent.children[0], tunnel_rear: triggers_parent.children[1] };
        group.add(triggers.tunnel_front);
        group.add(triggers.tunnel_rear);

        group.add(turret_group);

        let turretPositions = [];
        let turretRotations = [];
        for (let i = 0; i < turret_roots.children.length; i++) {
            turretPositions.push(turret_roots.children[i].position);
            // flip y rotation if z is -180
            turretRotations.push((turret_roots.children[i].rotation.z < -3.14) ? app.pi - turret_roots.children[i].rotation.y : turret_roots.children[i].rotation.y);
        }

        // add propellers
        let propellers = [];

        for (let i = 0; i < propeller_roots.children.length; i++) {
            let clone = propeller_mesh.clone();
            clone.position.set(0.0, 0.0, 0.0);
            propeller_roots.children[i].add(clone);
            propellers.push(clone);
        }

        let smallPropellers = [];

        for (let i = 0; i < smallPropeller_roots.children.length; i++) {
            let clone = smallPropeller_mesh.clone();
            clone.position.set(0.0, 0.0, 0.0);
            smallPropeller_roots.children[i].add(clone);
            smallPropellers.push(clone);
        }

        // add cogs
        let cogs = [];

        for (let i = 0; i < cog_roots.children.length; i++) {
            let clone = cog_mesh.clone();
            clone.position.set(0.0, 0.0, 0.0);
            cog_roots.children[i].add(clone);
            cogs.push(clone);
        }

        return {
            object: group,
            mesh: mesh,
            rayMesh: rayMesh,
            core_group: core_group,
            core_rayMesh: core_rayMesh,
            doors_front_group: doors_front_group,
            doors_rear_group: doors_rear_group,
            door_front_rayMesh: door_front_rayMesh,
            door_rear_rayMesh: door_rear_rayMesh,
            material: skyland_material,
            highlight_material: skyland_highlight_material,
            core_material: skyland_core_material,
            triggers: triggers,
            turrets: turret_group,
            turretPositions: turretPositions, turretRotations: turretRotations,
            cogs: cogs,
            propellers: propellers,
            smallPropellers: smallPropellers
        };
    }

    app.dispose_fortress = function () {
        console.log('dispose_fortress');
        if (app.fortress != null) {
            app.deactivate_fortress();
            if (app.fortress.asset.turrets) app.fortress.asset.object.remove(app.fortress.asset.turrets);
            app.dispose_geometry(app.fortress.asset.object);
            app.fortress = null;
            if (app.skylandObject != null) {
                app.skylandObject = null;
                app.gltf_scenes['skyland'] = null;
                app.dispose_material(skyland_material);
                app.dispose_material(skyland_core_material);
                app.dispose_material(skyland_highlight_material);
                app.dispose_texture(skyland_colorMap);
                app.dispose_texture(skyland_secondary);
            }
            if (app.tankObject != null) {
                app.tankObject = null;
                app.gltf_scenes['tank'] = null;
                app.dispose_material(tank_material);
                app.dispose_material(tank_gun_material);
                app.dispose_material(tank_core_material);
                app.dispose_material(tank_highlight_material);
                app.dispose_texture(tank_colorMap);
                app.dispose_texture(tank_secondary);
            }
        }
    }

    // explosions
    var smallExplosion_geometry = new THREE.PlaneBufferGeometry();
    var smallExplosion_material = app.get_particleMaterial();
    smallExplosion_material.name = "smallExplosion";

    function get_smallExplosion() {
        var material = smallExplosion_material.clone();
        var plane = new THREE.Mesh(smallExplosion_geometry, material);
        material.uniforms.colorMap.value = smallExplosion_colorMap;
        material.uniforms.atlas_columns.value = 4;
        material.uniforms.atlas_rows.value = 4;

        let interval;
        return { object: plane, material: material, interval: interval };
    }

    var spawn_smallExplosion_rotation = 0.0;
    app.spawn_smallExplosion = function (scale, intervalFreq, position, owner) {
        // owner 0: player
        // owner 1: enemy
        var smallExplosion = get_smallExplosion();
        spawn_smallExplosion_rotation = app.clock.elapsedTime % 31.4;
        smallExplosion.object.position.copy(position);
        var random_scale = spawn_smallExplosion_rotation * 2 + scale;
        smallExplosion.object.scale.set(random_scale, random_scale, 1);
        smallExplosion.interval = setInterval(app.animateSpritesheet, intervalFreq, smallExplosion, 16, spawn_smallExplosion_rotation, app.animationTypes.oneshot, true, owner);
        app.scene.add(smallExplosion.object);

        if (app.soundfx_on) {
            if (owner == 0) {
                app.play_playerExplosion_sound(smallExplosion.object, scale);
            } else {
                app.play_enemyExplosion_sound(smallExplosion.object, scale);
            }
        }

        return smallExplosion;
    }

    // ======== GLTF loading ========
    const gltf_loader = new THREE.GLTFLoader();
    gltf_loader.crossOrigin = true;

    var fileIndex = 0;
    app.load_gltf = function () {
        if (fileIndex > Object.keys(gltf_files).length - 1) {
            // all files done
            app.gltf_loadingDone = true;
            return;
        }
        let key = Object.keys(gltf_files)[fileIndex]; // get key by index
        gltf_loader.load(gltf_files[key], function (gltf) {
            app.gltf_scenes[key] = (gltf.scene); // add to scenes dict
            fileIndex++;
            app.load_gltf(); // load next file
        });
    }

    function get_objects(name) {
        switch (name) {
            case 'terrain_ground': app.terrainObject = get_terrain(); Object.seal(app.terrainObject); break;
            case 'tuna': app.tunaObject = get_tuna(); Object.seal(app.tunaObject); break;
        }
    }

    // ======== canvas ========
    function createCanvas(image) {
        // instantiate a loader
        let canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        let context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        return context;
    }

    app.resourceLoadingCheck_interval = setInterval(checkLoadingStatus, 100, 'init');

    return app;
}(MODULE));