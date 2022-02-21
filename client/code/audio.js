
(function (app) {

    app.listener = new THREE.AudioListener();
    app.listener.setMasterVolume(0.5);
    app.camera.add(app.listener);

    var propeller_sound = new THREE.AudioLoader();
    app.propeller_sound = new THREE.Audio(app.listener);

    var wind_sound = new THREE.AudioLoader();
    app.wind_sound = new THREE.Audio(app.listener);

    var fireball_sound = new THREE.AudioLoader();
    app.fireball_sound0 = new THREE.PositionalAudio(app.listener); // player
    app.fireball_sound1 = new THREE.PositionalAudio(app.listener); // enemy

    var explosion_sound = new THREE.AudioLoader();
    app.explosion_sound0 = new THREE.PositionalAudio(app.listener); // player
    app.explosion_sound1 = new THREE.PositionalAudio(app.listener); // enemy

    var collision_sound = new THREE.AudioLoader();
    app.collision_sound = new THREE.Audio(app.listener);


    app.load_level_audio = function () {
        if (app.level.stageIndex != app.stages.space) {
            propeller_sound.load('assets/audio/propeller.ogg', function (buffer) {
                app.propeller_sound.setBuffer(buffer);
                app.propeller_sound.setLoop(true);
                app.propeller_sound.setVolume(0.0);
            });

            wind_sound.load('assets/audio/wind.ogg', function (buffer) {
                app.wind_sound.setBuffer(buffer);
                app.wind_sound.setLoop(true);
                app.wind_sound.setVolume(0.3);
            });
        } else {
            propeller_sound.load('assets/audio/jet.ogg', function (buffer) {
                app.propeller_sound.setBuffer(buffer);
                app.propeller_sound.setLoop(true);
                app.propeller_sound.setVolume(0.0);
            });
        }

        fireball_sound.load('assets/audio/fireball.ogg', function (buffer) {
            app.fireball_sound0.setBuffer(buffer);
            app.fireball_sound1.setBuffer(buffer);
            app.fireball_sound0.setRefDistance(200);
            app.fireball_sound1.setRefDistance(200);
            app.fireball_sound0.setVolume(0.3);
            app.fireball_sound1.setVolume(0.3);
        });

        explosion_sound.load('assets/audio/explosion.ogg', function (buffer) {
            app.explosion_sound0.setBuffer(buffer);
            app.explosion_sound1.setBuffer(buffer);
            app.explosion_sound0.setRefDistance(500);
            app.explosion_sound1.setRefDistance(500);
            app.explosion_sound0.setVolume(0.3);
            app.explosion_sound1.setVolume(0.3);
        });

        collision_sound.load('assets/audio/collision.ogg', function (buffer) {
            app.collision_sound.setBuffer(buffer);
            app.collision_sound.setVolume(1);
        });
    }

    app.start_level_audio = function () {
        if (!app.soundfx_on) return;

        reset_level_audio();
        if (app.level.stageIndex != app.stages.space) {
            app.propeller_sound.play();
            app.wind_sound.play();
        } else {
            app.propeller_sound.play();
        }
    }

    app.stop_level_audio = function () {
        if (app.propeller_sound.isPlaying) app.propeller_sound.stop();
        if (app.wind_sound.isPlaying) app.wind_sound.stop();
    }

    function reset_level_audio() {
        app.propeller_sound.setVolume(0.0);
    }

    var rounded_speed = 0;

    app.update_audio = function () {
        if (app.level.stageIndex != app.stages.space) {
            rounded_speed = (Math.floor(app.playerObject.speed) * 0.05) * 20;
            if (app.frameCount % 5 == 0) {
                // delay to avoid noise
                app.propeller_sound.setVolume(Math.min(rounded_speed * 0.01, 0.3));
                (rounded_speed > 50) ? app.propeller_sound.setDetune(Math.floor(rounded_speed) * 5 - 100) : app.propeller_sound.setDetune(0);
            }
        } else {
            app.propeller_sound.setVolume(app.playerSelectedSpeed);
            app.propeller_sound.setDetune(app.playerSelectedSpeed * 500);
        }
    }

    app.play_playerRocket_sound = function (parent, power) {
        if (!app.soundfx_on) return;

        if (app.fireball_sound0.isPlaying) app.fireball_sound0.stop();
        parent.add(app.fireball_sound0);
        app.fireball_sound0.play();
        app.fireball_sound0.setVolume(Math.min(power * 0.01, 1));
    }

    app.play_enemyRocket_sound = function (parent, power) {
        if (!app.soundfx_on) return;

        if (app.fireball_sound1.isPlaying) app.fireball_sound1.stop();
        parent.add(app.fireball_sound1);
        app.fireball_sound1.play();
        app.fireball_sound1.setVolume(Math.min(power * 0.04, 1));
    }

    app.play_playerExplosion_sound = function (parent, power) {
        if (!app.soundfx_on) return;

        if (app.explosion_sound0.isPlaying) app.explosion_sound0.stop();
        parent.add(app.explosion_sound0);
        app.explosion_sound0.play();
        app.explosion_sound0.setVolume(Math.min(power * 0.01, 1));
    }

    app.play_enemyExplosion_sound = function (parent, power) {
        if (!app.soundfx_on) return;

        if (app.explosion_sound1.isPlaying) app.explosion_sound1.stop();
        parent.add(app.explosion_sound1);
        app.explosion_sound1.play();
        app.explosion_sound1.setVolume(Math.min(power * 0.03, 1));
        app.explosion_sound1.setDetune(0);
    }

    app.play_collision_sound = function (power) {
        if (!app.soundfx_on) return;

        if (app.collision_sound.isPlaying) app.collision_sound.stop();
        app.collision_sound.play();
        app.collision_sound.setVolume(Math.min(power, 1));
    }

    return app;
}(MODULE));