(function (app) {

    var in_settings_aa;
    var in_settings_shadows;
    var in_settings_invert;
    var in_settings_soundfx;
    var in_lobby_server;

    var storageFile = null;
    var storageFile_object = null;

    app.initSettings = function () {
        in_settings_aa = document.getElementById('settings_aa');
        in_settings_shadows = document.getElementById('settings_shadows');
        in_settings_invert = document.getElementById('settings_invert');
        in_settings_soundfx = document.getElementById('settings_soundfx');
        in_lobby_server = document.getElementById("lobby_server");

        loadSettings();
    }

    function loadSettings() {
        if (localStorage.getItem('version')) {
            loadStorage();
            //localStorage.clear();
        } else {
            app.updateSettings();
            init_levelScores();
        }
    }

    app.setSelectByValue = function (element, value) {
        var elementValue;
        if (value == null) {
            elementValue = element.value;
        } else {
            elementValue = value;
        }
        element.value = elementValue;
        var options = element.getElementsByTagName('OPTION');
        for (var i = 0; i < options.length; i++) {
            if (options[i].value == elementValue) {
                options[i].selected = true;
                return options[i].value;
            }
        }
    }

    app.updateSettings = function () {
        app.supersampling_on = (in_settings_aa.value == 'true') ? true : false;
        app.shadowDecals_on = (in_settings_shadows.value == 'true' && !app.multiplayerMode) ? true : false;
        app.invertAxis = (in_settings_invert.value == 'true') ? true : false;
        app.soundfx_on = (in_settings_soundfx.value == 'true') ? true : false;
        if (app.gameRunning && app.soundfx_on) app.load_level_audio();

        if (app.benchmarkMode) {
            app.require_reset = true;
        }

        updateStorage()
        updateGraphics();
    }

    // localStorage
    function loadStorage() {
        // settings
        let supersampling_on = app.setSelectByValue(in_settings_aa, localStorage.getItem('settings_aa'));
        app.supersampling_on = (supersampling_on == 'true') ? true : false;

        let shadowDecals_on = app.setSelectByValue(in_settings_shadows, localStorage.getItem('settings_shadows'));
        app.shadowDecals_on = (shadowDecals_on == 'true' && !app.multiplayerMode) ? true : false;

        let invertAxis = app.setSelectByValue(in_settings_invert, localStorage.getItem('settings_invert'));
        app.invertAxis = (invertAxis == 'true') ? true : false;

        let soundfx_on = app.setSelectByValue(in_settings_soundfx, localStorage.getItem('settings_soundfx'));
        app.soundfx_on = (soundfx_on == 'true') ? true : false;

        let mp_server = app.setSelectByValue(in_lobby_server, localStorage.getItem('mp_server'));
        app.setServer(parseInt(mp_server));

        // player
        if (localStorage.getItem('levelScores')) {
            let scoreArray = localStorage.getItem('levelScores');
            scoreArray = scoreArray.split(",");
            for (let i = 0; i < scoreArray.length; i++) {
                let score = parseInt(scoreArray[i]);
                app.levelScores.push(score);
            }
            check_levelScore_length(); // number of level still the same?
        } else {
            init_levelScores();
        }
        updateGraphics();
    }

    app.init_playerID = () => {
        var ts = new Date().getTime();
        var random = Math.random() * 99999;
        random = Math.floor(random);
        random.toString();

        let playerID;
        ts = Math.floor(ts / 100);
        playerID = ts.toString();
        playerID = playerID.concat(random);
        playerID = parseInt(playerID);
        app.playerID = playerID;
    }

    app.format_playerName = () => {
        if (app.playerName && app.playerName != '') {
            if (app.playerName.length > 10) {
                app.playerName = app.playerName.slice(0, 10);
            } else if (app.playerName.length < 3) {
                app.playerName = '';
            }
            app.playerName = app.playerName.replace(/[\W_]+/g, "_");
        } else {
            app.playerName = '';
        }
    }

    var lobby_playerName_node = document.getElementById("lobby_playerName");
    var filename = "airshipcombat_store.txt";

    app.file_read = (override, onFinished) => {
        if (app.isKaiOS) {
            var get_file = app.deviceStorage.get(filename);
            get_file.onsuccess = () => {
                storageFile = get_file.result;
                // console.log("file found", storageFile);

                if (override) {
                    app.file_delete();
                } else {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (reader.result) storageFile_object = JSON.parse(reader.result);
                        // console.log(storageFile_object);

                        if (storageFile_object instanceof Object) {
                            if (storageFile_object.playerID) app.playerID = storageFile_object.playerID;
                            if (storageFile_object.playerName) app.playerName = storageFile_object.playerName;
                            if (storageFile_object.killScore) app.playerObject.killScore = storageFile_object.killScore;
                            if (storageFile_object.hitScore) app.playerObject.hitScore = storageFile_object.hitScore;
                            if (storageFile_object.mpLeader) app.playerObject.mpLeader = storageFile_object.mpLeader;
                            if (app.playerName) {
                                app.format_playerName();
                                lobby_playerName_node.innerText = app.playerName;
                            }
                            onFinished();
                        }
                    }
                    reader.onerror = () => {
                        console.warn("Can\'t read file", reader.error);
                    }

                    reader.readAsText(storageFile);
                }
            }

            get_file.onerror = () => {
                console.log("Can\'t access file", get_file.error);
                if (get_file.error.name == "SecurityError") {
                    app.show_systemMessage('warning', 'memory card access required to load player profile', 3000);
                } else {
                    app.file_write();
                }
            }
        } else {
            // on PC
            if (override) {
                localStorage.setItem('playerID', app.playerID);
                localStorage.setItem('playerName', app.playerName);
                localStorage.setItem('killScore', app.playerObject.killScore);
                localStorage.setItem('hitScore', app.playerObject.hitScore);
                localStorage.setItem('mpLeader', app.playerObject.mpLeader);
            } else {
                app.playerID = parseInt(localStorage.getItem('playerID')) || null;
                if (app.playerID == null) {
                    app.init_playerID();
                    localStorage.setItem('playerID', app.playerID);
                }
                app.playerName = localStorage.getItem('playerName') || null;
                app.format_playerName();
                lobby_playerName_node.innerText = app.playerName;
                app.playerObject.killScore = localStorage.getItem('killScore') || 0;
                app.playerObject.killScore = parseInt(app.playerObject.killScore);

                app.playerObject.hitScore = localStorage.getItem('hitScore') || 0;
                app.playerObject.hitScore = parseInt(app.playerObject.hitScore);

                app.playerObject.mpLeader = localStorage.getItem('mpLeader') || 0;
                app.playerObject.mpLeader = parseInt(app.playerObject.mpLeader);
                onFinished();
            }
        }
        // console.log('reading file', override, app.playerID, app.playerName, app.playerObject.killScore, app.playerObject.hitScore)
    }

    app.file_delete = () => {
        var delete_file = app.deviceStorage.delete(filename);

        delete_file.onsuccess = function () {
            var name = delete_file.result;
            // console.log('File "' + name + '" deleted');
            app.file_write();
        }

        delete_file.onerror = function () {
            console.warn('Unable to delete the file: ' + delete_file.error);
            app.show_systemMessage('warning', 'can\'t access stored data', 3000);
        }
    }

    app.file_write = () => {
        var content = JSON.stringify({
            "v": app.version,
            "playerID": app.playerID,
            "playerName": app.playerName,
            "killScore": app.playerObject.killScore,
            "hitScore": app.playerObject.hitScore,
            "mpLeader": app.playerObject.mpLeader
        });

        var file = new Blob([content], { type: "text/plain" });
        var write_file = app.deviceStorage.addNamed(file, filename);

        write_file.onsuccess = function () {
            // var name = write_file.result;
            // console.log('File "' + name + '" successfully written');
        }

        write_file.onerror = function () {
            console.warn('Unable to write the file:', write_file.error);
            app.show_systemMessage('warning', 'can\'t write data', 3000);
        }
    }

    function init_levelScores() {
        app.levelScores = [];
        for (let i = 0; i < app.levelList.length; i++) {
            app.levelScores.push(0);
        }

        localStorage.setItem('levelScores', app.levelScores);
    }

    function check_levelScore_length() {
        if (app.levelList.length != app.levelScores.length) {
            init_levelScores(); // reset score
        }
    }

    function updateGraphics() {
        if (app.supersampling_on) {
            app.renderingWidth = app.screenWidth * 2;
            app.renderingHeight = app.screenHeight * 2;
        } else {
            app.renderingWidth = app.screenWidth;
            app.renderingHeight = app.screenHeight;
        }
        app.renderer.setSize(app.renderingWidth, app.renderingHeight);
        app.shadowFBO.setSize(app.renderingWidth, app.renderingHeight);

        if (app.gameRunning) app.update_shaderDefines();
    }

    function updateStorage() {
        if (!localStorage.getItem('version')) localStorage.setItem('version', parseInt(app.version));
        localStorage.setItem('settings_aa', app.supersampling_on);
        if (!app.multiplayerMode) localStorage.setItem('settings_shadows', app.shadowDecals_on);
        localStorage.setItem('settings_invert', app.invertAxis);
        localStorage.setItem('settings_soundfx', app.soundfx_on);
        if (app.debuggenzeit) console.log('updateStorage');
    }

    app.deleteProgress = function () {
        app.stageIndex = 0;
        app.levelIndex = 0;
        localStorage.setItem('stageIndex', '0');
        localStorage.setItem('levelIndex', '0');
        localStorage.setItem('levelID', app.start_levelID);
        localStorage.setItem('progressIndex', '0');
        localStorage.setItem('version', parseInt(app.version));
        init_levelScores();
        app.currentView.scrollTo(0, 0);
    }

    var prev_server_index = 0;

    app.setServer = (index) => {
        if (app.isLocalServer) {
            app.mp_server = "ws://localhost:5000";
            return;
        } else if (app.isTestServer) {
            app.mp_server = "wss://[DOMAIN]";
            return;
        }

        switch (index) {
            case 0: app.mp_server = "wss://[DOMAIN]";
                break;
            case 1: app.mp_server = "wss://[DOMAIN]";
                break;
        }

        if (app.mp_connected && prev_server_index != index) {
            app.switch_server();
            localStorage.setItem('mp_server', index);
        }

        prev_server_index = index;
    }

    return app;
}(MODULE));