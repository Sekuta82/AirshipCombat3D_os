(function (app) {

    const instance_count = 100;
    var asteroid0_instances = null, asteroid1_instances = null, asteroid2_instances = null;
    var raymesh0_instances, raymesh1_instances, raymesh2_instances;
    var raytarget_material = new THREE.MeshBasicMaterial({ color: 0x000000, visible: false });
    var transform0 = new THREE.Object3D();
    var transform1 = new THREE.Object3D();
    var transform2 = new THREE.Object3D();

    const spawnDelay = 2;
    var spawnDelay_timer = 0;

    app.init_asteroids = function () {

        app.asteroidsObject = app.get_asteroids();

        app.scene.add(app.planetObject.object);

        if (asteroid0_instances == null) {
            asteroid0_instances = new THREE.InstancedMesh(app.asteroidsObject.asteroids[0].geometry, app.asteroidsObject.material, instance_count);
            asteroid1_instances = new THREE.InstancedMesh(app.asteroidsObject.asteroids[1].geometry, app.asteroidsObject.material, instance_count);
            asteroid2_instances = new THREE.InstancedMesh(app.asteroidsObject.asteroids[2].geometry, app.asteroidsObject.material, instance_count);

            raymesh0_instances = new THREE.InstancedMesh(app.asteroidsObject.rayMeshes[0].geometry, raytarget_material, instance_count);
            raymesh1_instances = new THREE.InstancedMesh(app.asteroidsObject.rayMeshes[1].geometry, raytarget_material, instance_count);
            raymesh2_instances = new THREE.InstancedMesh(app.asteroidsObject.rayMeshes[2].geometry, raytarget_material, instance_count);
            reset_positions();
        }

        app.scene.add(asteroid0_instances); app.scene.add(raymesh0_instances);
        app.scene.add(asteroid1_instances); app.scene.add(raymesh1_instances);
        app.scene.add(asteroid2_instances); app.scene.add(raymesh2_instances);
    }

    app.deactivate_asteroids = function () {
        app.scene.remove(asteroid0_instances); app.scene.remove(raymesh0_instances);
        app.scene.remove(asteroid1_instances); app.scene.remove(raymesh1_instances);
        app.scene.remove(asteroid2_instances); app.scene.remove(raymesh2_instances);

        asteroid0_instances = null;
        asteroid1_instances = null;
        asteroid2_instances = null;
        raymesh0_instances = null;
        raymesh1_instances = null;
        raymesh2_instances = null;
    }

    app.dispose_asteroids = function () {
        console.log('dispose_asteroids');
        if (app.asteroidsObject != null) {
            for (let i = 0; i < 3; i++) {
                app.dispose_geometry(app.asteroidsObject.asteroids[i]);
                app.dispose_geometry(app.asteroidsObject.rayMeshes[i]);
            }
            if (asteroid0_instances != null) {
                app.dispose_geometry(asteroid0_instances);
                app.dispose_geometry(asteroid1_instances);
                app.dispose_geometry(asteroid2_instances);
                app.dispose_geometry(raymesh0_instances);
                app.dispose_geometry(raymesh1_instances);
                app.dispose_geometry(raymesh2_instances);
            }

            app.deactivate_asteroids();

            app.asteroidsObject.material.dispose();
            app.asteroidsObject.colorMap.dispose();

            app.asteroidsObject = null;
        }
    }

    var newPosition0 = new THREE.Vector3();
    var newPosition1 = new THREE.Vector3();
    var newPosition2 = new THREE.Vector3();
    var randomPosition = new THREE.Vector3();
    var randomRotation = 0;

    var instance_range = 0;
    const position_jitter = 20000;

    function activate_asteroids() {
        var range_start = instance_range % instance_count;
        var range_end = range_start + 1;

        for (let i = range_start; i < range_end; i++) {
            newPosition0.copy(app.playerObject.worldPosition);
            newPosition0.addScaledVector(app.movingDirection, -50000);

            randomPosition.set(
                THREE.Math.randInt(-position_jitter, position_jitter),
                THREE.Math.randInt(-position_jitter, position_jitter),
                THREE.Math.randInt(-position_jitter, position_jitter)
            );

            newPosition0.add(randomPosition);

            newPosition1.set(newPosition0.x, newPosition0.y, newPosition0.z)
            newPosition1.x += randomPosition.y;
            newPosition1.y += randomPosition.z;
            newPosition1.z += randomPosition.x;

            newPosition2.set(newPosition0.x, newPosition0.y, newPosition0.z)
            newPosition2.x += randomPosition.z;
            newPosition2.y += randomPosition.x;
            newPosition2.z += randomPosition.y;

            randomRotation = Math.random() * 2 * Math.PI;
            transform0.rotation.set(randomRotation, randomRotation, randomRotation);
            transform1.rotation.set(randomRotation, randomRotation, randomRotation);
            transform2.rotation.set(randomRotation, randomRotation, randomRotation);

            transform0.position.set(newPosition0.x, newPosition0.y, newPosition0.z);
            transform1.position.set(newPosition1.x, newPosition1.y, newPosition1.z);
            transform2.position.set(newPosition2.x, newPosition2.y, newPosition2.z);
            transform0.updateMatrix(); transform1.updateMatrix(); transform2.updateMatrix();

            asteroid0_instances.setMatrixAt(i, transform0.matrix); raymesh0_instances.setMatrixAt(i, transform0.matrix);
            asteroid1_instances.setMatrixAt(i, transform1.matrix); raymesh1_instances.setMatrixAt(i, transform1.matrix);
            asteroid2_instances.setMatrixAt(i, transform2.matrix); raymesh2_instances.setMatrixAt(i, transform2.matrix);
        }

        instance_range++;
    }

    app.reset_asteroids = function () {
        app.raycastTargets.push(raymesh0_instances);
        app.raycastTargets.push(raymesh1_instances);
        app.raycastTargets.push(raymesh2_instances);

        reset_positions();
    }

    function reset_positions() {
        transform0.position.set(0, -9999, 0);
        transform0.scale.set(1, 1, 1);
        transform0.updateMatrix();

        for (let i = 0; i < instance_count; i++) {
            asteroid0_instances.setMatrixAt(i, transform0.matrix); raymesh0_instances.setMatrixAt(i, transform0.matrix);
            asteroid1_instances.setMatrixAt(i, transform0.matrix); raymesh1_instances.setMatrixAt(i, transform0.matrix);
            asteroid2_instances.setMatrixAt(i, transform0.matrix); raymesh2_instances.setMatrixAt(i, transform0.matrix);
        }
        asteroid0_instances.instanceMatrix.needsUpdate = true; raymesh0_instances.instanceMatrix.needsUpdate = true;
        asteroid1_instances.instanceMatrix.needsUpdate = true; raymesh1_instances.instanceMatrix.needsUpdate = true;
        asteroid2_instances.instanceMatrix.needsUpdate = true; raymesh2_instances.instanceMatrix.needsUpdate = true;
    }

    var animationMatrix = new THREE.Matrix4();
    var scaleMatrix = new THREE.Matrix4();
    var instanceMatrix = new THREE.Matrix4();
    var matrix = new THREE.Matrix4();
    var currentScale = 0;
    var newScale = 0;

    app.update_asteroids = function () {
        spawnDelay_timer -= app.deltaTime * app.playerObject.speed * 0.0025;
        if (spawnDelay_timer <= 0) {
            spawnDelay_timer = spawnDelay;
            activate_asteroids();
        }

        // rotate and scale asteroids
        for (let i = 0; i < instance_count; i++) {
            animationMatrix.makeRotationY(app.deltaTime * 0.5);

            // batch 0
            asteroid0_instances.getMatrixAt(i, instanceMatrix);
            currentScale = instanceMatrix.getMaxScaleOnAxis();
            if (currentScale < 40) {
                newScale = 1 + app.deltaTime * (1 - currentScale * 0.025);
                scaleMatrix.makeScale(newScale, newScale, newScale);
                animationMatrix.multiply(scaleMatrix);
            }
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            asteroid0_instances.setMatrixAt(i, matrix);

            raymesh0_instances.getMatrixAt(i, instanceMatrix);
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            raymesh0_instances.setMatrixAt(i, matrix);

            // batch 1
            asteroid1_instances.getMatrixAt(i, instanceMatrix);
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            asteroid1_instances.setMatrixAt(i, matrix);

            raymesh1_instances.getMatrixAt(i, instanceMatrix);
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            raymesh1_instances.setMatrixAt(i, matrix);

            // batch 2
            asteroid2_instances.getMatrixAt(i, instanceMatrix);
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            asteroid2_instances.setMatrixAt(i, matrix);

            raymesh2_instances.getMatrixAt(i, instanceMatrix);
            matrix.multiplyMatrices(instanceMatrix, animationMatrix);
            raymesh2_instances.setMatrixAt(i, matrix);
        }
        asteroid0_instances.instanceMatrix.needsUpdate = true; raymesh0_instances.instanceMatrix.needsUpdate = true;
        asteroid1_instances.instanceMatrix.needsUpdate = true; raymesh1_instances.instanceMatrix.needsUpdate = true;
        asteroid2_instances.instanceMatrix.needsUpdate = true; raymesh2_instances.instanceMatrix.needsUpdate = true;
    }

    return app;
}(MODULE));