(function (app) {

    var userAgent = navigator.userAgent;
    var volume = null;
    var battery = null;
    var batteryManager = null;
    var batteryChecker = null;

    var systemMessage;
    var systemMessage_timeout;

    var activity_timeout;
    var activity_time = 10;

    var deviceStorages;
    app.deviceStorage = null;

    if (userAgent.includes('KAIOS')) {
        app.isKaiOS = true;
        navigator.requestWakeLock('screen');
        try {
            navigator.minimizeMemoryUsage();
        } catch (e) {
            console.log('minimizeMemoryUsage not supported');
        }

        window.navigator.hasFeature("device.capability.qwerty").then(function (status) {
            if (status) { //status is ‘true’ for QWERTY 
                app.isQWERTY = true;
            }
        });

        volume = navigator.volumeManager;

        battery = navigator.getBattery();
        battery.then(batterySuccess, batteryFailed);

        // internal storage
        deviceStorages = navigator.getDeviceStorages("sdcard");
        if (Array.isArray(deviceStorages)) app.deviceStorage = deviceStorages[0];

        setTimeout(() => {
            adReleased = true;
            // preload next ad
            app.showAd();
        }, 2000);
    }

    window.addEventListener("resize", function () {
        if (window.innerHeight < window.innerWidth) {
            if (!app.landscapeOrientation) {
                orientation_chang(true);
            }
        } else {
            if (app.landscapeOrientation) {
                orientation_chang(false);
            }
        }
    }, false);

    function orientation_chang(landscape) {
        app.landscapeOrientation = landscape;
        app.update_levelGrid();
        app.orientation_changed = true;
    }

    //input mapping
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keypress', handleKeyPress);

    function handleKeyPress(e) { if (app.isKaiOS && !app.isInputFocused) e.preventDefault(); }

    function handleKeyDown(e) {
        if (app.promptActive) return;
        if (app.isKaiOS && !app.isInputFocused) e.preventDefault();
        if (app.isKaiOS) reset_activity_timeout();

        // console.log(e.key);
        if (!app.landscapeOrientation) {
            switch (e.key) {
                case 'ArrowUp':
                case '2':
                    app.keyCallbackDown.dUp();
                    break;
                case 'ArrowDown':
                case '8':
                    app.keyCallbackDown.dDown();
                    break;
                case '0':
                case 'f':
                    app.keyCallbackDown.reverse();
                    break;
                case 'ArrowLeft':
                case '1':
                case '4':
                case '7':
                    app.keyCallbackDown.dLeft();
                    break;
                case 'ArrowRight':
                case '3':
                case '6':
                case '9':
                    app.keyCallbackDown.dRight();
                    break;
                case 'Enter':
                case '5':
                    app.keyCallbackDown.enter();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    break;
                case '#':
                    if (app.isKaiOS && !app.gamePaused) volume.requestShow();
                    break;
            }
        } else {
            switch (e.key) {
                case 'ArrowUp':
                case 't':
                case 'y':
                    app.keyCallbackDown.dUp();
                    break;
                case 'ArrowDown':
                case 'v':
                case 'b':
                    app.keyCallbackDown.dDown();
                    break;
                case 'ArrowLeft':
                case 'e':
                case 'r':
                case 'd':
                case 'f':
                case 'x':
                case 'c':
                    app.keyCallbackDown.dLeft();
                    break;
                case 'ArrowRight':
                case 'u':
                case 'i':
                case 'j':
                case 'k':
                case 'n':
                case 'm':
                    app.keyCallbackDown.dRight();
                    break;
                case 'Enter':
                case 'g':
                case 'h':
                    app.keyCallbackDown.enter();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    break;
                case '4':
                    if (app.isKaiOS && !app.gamePaused) volume.requestShow();
                    break;
            }
        }
    }
    function handleKeyUp(e) {
        if (app.promptActive) return;
        // console.log(e);
        if (app.isKaiOS && !app.isInputFocused || app.isPage) e.preventDefault();
        // console.log(e.key);
        if (!app.landscapeOrientation) {
            switch (e.key) {
                case 'ArrowUp':
                case '2':
                    app.keyCallbackUp.dUp();
                    break;
                case 'ArrowDown':
                case '8':
                    app.keyCallbackUp.dDown();
                    break;
                case '0':
                case 'f':
                    app.keyCallbackUp.reverse();
                    break;
                case 'ArrowLeft':
                case '1':
                case '4':
                case '7':
                    app.keyCallbackUp.dLeft();
                    break;
                case 'ArrowRight':
                case '3':
                case '6':
                case '9':
                    app.keyCallbackUp.dRight();
                    break;
                case 'SoftLeft':
                case 'Control': /* use on PC */
                    app.keyCallbackUp.softLeft();
                    break;
                case 'SoftRight':
                case 'Shift': /* use on PC */
                    app.keyCallbackUp.softRight();
                    break;
                case 'Enter':
                case '5':
                    app.keyCallbackUp.enter();
                    break;
                case 'ContextMenu':
                    app.keyCallbackUp.menu();
                    break;
                case 'Backspace':
                case 'EndCall':
                    if (app.currentViewName == 'viewMenu' || app.currentViewName == 'viewLogo') {
                        let choice = confirm('Do you really want to quit?');
                        if (choice) {
                            app.keyCallbackUp.quit();
                        }
                    } else if (app.mp_joined && app.mp_connected) {
                        app.promptActive = true;
                        let mp_choice = confirm('Leave the online game?');
                        if (mp_choice) {
                            app.leave_game();
                            app.keyCallbackUp.back();
                        }
                        app.postPromptDelay();
                    } else {
                        if (app.currentViewName != 'viewLoading') app.keyCallbackUp.back();
                    }
                    break;
                case 'q':
                    if (app.debugKeys && app.gameRunning) app.boost_player(2);
                    break;
                case 's':
                    if (app.debugKeys && app.gameRunning) app.playerMoving = !app.playerMoving;
                    break;
                case 'p':
                    if (app.debugKeys && app.gameRunning) app.gamePaused = !app.gamePaused;
                    break;
                default:
                    app.keyCallbackUp.other(e.key);
            }
        } else {
            switch (e.key) {
                case 'ArrowUp':
                case 't':
                case 'y':
                    app.keyCallbackUp.dUp();
                    break;
                case 'ArrowDown':
                case 'v':
                case 'b':
                    app.keyCallbackUp.dDown();
                    break;
                case 'ArrowLeft':
                case 'e':
                case 'r':
                case 'd':
                case 'f':
                case 'x':
                case 'c':
                    app.keyCallbackUp.dLeft();
                    break;
                case 'ArrowRight':
                case 'u':
                case 'i':
                case 'j':
                case 'k':
                case 'n':
                case 'm':
                    app.keyCallbackUp.dRight();
                    break;
                case 'SoftLeft':
                case 'Control': /* use on PC */
                    app.keyCallbackUp.softLeft();
                    break;
                case 'SoftRight':
                case 'Shift': /* use on PC */
                    app.keyCallbackUp.softRight();
                    break;
                case 'Enter':
                case 'g':
                case 'h':
                    app.keyCallbackUp.enter();
                    break;
                case 'ContextMenu':
                    app.keyCallbackUp.menu();
                    break;
                case 'Backspace':
                    app.keyCallbackUp.back();
                    break;
                case 'EndCall':
                    app.keyCallbackUp.quit();
                    break;
                case 'q':
                    if (app.debugKeys && app.gameRunning) app.boost_player(2);
                    break;
                case 's':
                    if (app.debugKeys && app.gameRunning) app.playerMoving = !app.playerMoving;
                    break;
                case 'p':
                    if (app.debugKeys && app.gameRunning) app.gamePaused = !app.gamePaused;
                    break;
                default:
                    app.keyCallbackUp.other(e.key);
            }
        }
    }

    function batterySuccess(e) {
        batteryManager = e;
        batteryChecker = setInterval(checkBatteryStatus, 5 * 60000);
    }

    function batteryFailed() {
        console.log("batteryFailed");
    }

    function checkBatteryStatus() {
        app.batteryLevel = batteryManager.level;
        app.batteryTemperature = batteryManager.temperature;

        if (batteryManager.level <= 0.1) {
            app.show_systemMessage('critical', 'battery charge critical! shutting down', 5000);
            return;
        } else if (batteryManager.level <= 0.2) {
            app.show_systemMessage('warning', 'battery charge low', 4000);
            return;
        }

        if (batteryManager.temperature > 65) {
            app.show_systemMessage('warning', 'battery temperature high', 4000);
            return;
        }
    }

    function reset_activity_timeout() {
        clearTimeout(activity_timeout);
        activity_timeout = setTimeout(player_inactive, activity_time * 60000);
    }

    function player_inactive() {
        app.show_systemMessage('critical', 'inactive for ' + activity_time + ' minutes. shutting down', 5000);
    }

    app.show_systemMessage = (level, message, duration) => {
        clearTimeout(systemMessage_timeout);
        systemMessage.style.display = 'block';
        systemMessage.className = level;
        systemMessage.innerText = message;

        if (level == 'critical') setTimeout(window.close, 5000);
        systemMessage_timeout = setTimeout(hide_systemMessage, duration || 1000);
    }

    function hide_systemMessage() {
        systemMessage.style.display = 'none';
        systemMessage.innerText = '';
    }

    var adReleased = false;
    document.addEventListener("DOMContentLoaded", () => {
        if (app.isKaiOS) {
            window.navigator.hasFeature("device.capability.qwerty").then(function (status) {
                if (status) { //status is ‘true’ for QWERTY 
                    app.landscapeOrientation = true;
                }
            });
        }

        if (!app.isKaiOS || app.isPage) return;

        systemMessage = document.getElementById('systemMessage');
    });

    app.showAd = function () {
        // console.log('showAd');
        if (app.isPage) return;
        if (!adReleased) return;
        adReleased = false;
        getKaiAd({
            publisher: '[YOUR PUBLISHER ID]',
            app: 'AirshipCombat3D_os',
            test: 0,
            timeout: 10000,

            onerror: err => { ad_error(err) },
            onready: ad => {
                // Ad is ready to be displayed
                console.log('ad ready');
                document.addEventListener('keyup', function btnListener(e) {
                    if (!app.inMenu || app.isInputFocused) return;
                    switch (e.key) {
                        case 'Enter':
                            document.removeEventListener('keyup', btnListener);
                            ad.call('display');
                            break;
                    }
                });

                ad.on('click', () => console.log('ad clicked'));
                ad.on('close', discardAd);
                ad.on('display', displayAd);
            }
        });
    }

    var ad_release_timeout = null;

    function ad_error(err) {
        console.error('KaiAds error catch:', err);
        app.fullAdVisible = false;
        clearTimeout(ad_release_timeout);
        ad_release_timeout = setTimeout(() => {
            adReleased = true;
            // preload next ad
            app.showAd();
        }, 30000);
    }

    function displayAd() {
        console.log('ad displayed');
        app.fullAdVisible = true;
        clearTimeout(ad_release_timeout);
        ad_release_timeout = setTimeout(() => {
            adReleased = true;
            // preload next ad
            app.showAd();
        }, 600000);
    }
    function discardAd() {
        console.log('ad closed');
        clearTimeout(ad_release_timeout);
        ad_release_timeout = setTimeout(() => {
            adReleased = true;
            // preload next ad
            app.showAd();
        }, 120000);

        setTimeout(() => {
            app.fullAdVisible = false;
            app.activeNavItem.focus();
        }, 200);
    }

    return app;
}(MODULE))