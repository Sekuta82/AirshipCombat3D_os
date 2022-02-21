var MODULE = (function () {
    var app = {};

    app.views = new Array();
    app.activeNavItem = null;
    app.currentView = null;
    app.currentViewID = 0;
    app.currentViewName = null;
    app.prevViewId = [0, 0, 0];
    app.currentNavId = 0;
    app.prevMenuId = 0;
    app.navItems = new Array();
    var navDepth = 0;
    var stageListContainer;
    var levelGridContainer;

    app.goBackInHistory = false;
    app.backEnabled = false;
    app.optionEnabled = false;
    app.fullAdVisible = false;
    app.previous_input_value = null;

    app.moveUp = false;
    app.moveDown = false;
    app.moveLeft = false;
    app.moveRight = false;

    app.promptActive = false;

    function checkForUpdate() {
        let app = navigator.mozApps.getSelf();
        app.onsuccess = function () {
            let thisApp = this.result;
            // console.log(thisApp);
            let updateCheck = thisApp.checkForUpdate();
            updateCheck.onsuccess = function () {
                // console.log('update checked');
                let updateAvailable = thisApp.downloadAvailable;
                if (updateAvailable) {
                    let choice = confirm('Update available. Download now?');
                    if (choice) thisApp.download();
                }
            }
            updateCheck.onerror = function () {
                console.log('update error', this.error.name);
            };
        }
        app.onerror = function () {
            console.log('updater: error', this.error.name);
            alert(this.error.name);
        };
    }

    // avoid opening in browser
    document.addEventListener('click', handleTouch, false);
    function handleTouch(e) {
        e.preventDefault();
        if (document.activeElement.tagName.toLowerCase() == 'a') {
            var url = document.activeElement.getAttribute('href');
            window.open(url);
        }
    }

    // button input
    app.keyCallbackDown = {
        dUp: function () {
            if (app.inMenu) {
                navVertical(false);
            } else if (!app.benchmarkMode) {
                app.invertAxis ? app.moveDown = true : app.moveUp = true;
            }
        },
        dDown: function () {
            if (app.inMenu) {
                navVertical(true);
            } else if (!app.benchmarkMode) {
                app.invertAxis ? app.moveUp = true : app.moveDown = true;
            }
        },
        dLeft: function () {
            if (app.inMenu) {
                navHorizontal(false);
            } else if (!app.benchmarkMode) {
                app.moveLeft = true;
            }
        },
        dRight: function () {
            if (app.inMenu) {
                navHorizontal(true);
            } else if (!app.benchmarkMode) {
                app.moveRight = true;
            }
        },
        enter: function () { if (!app.inMenu && !app.benchmarkMode) { app.chargeWeapon(); } },
        reverse: function () { if (!app.inMenu && !app.benchmarkMode) { app.reverseView = 1; } }
    };

    app.keyCallbackUp = {
        dUp: function () {
            if (!app.inMenu && !app.benchmarkMode) {
                app.invertAxis ? app.moveDown = false : app.moveUp = false;
            }
        },
        dDown: function () {
            if (!app.inMenu && !app.benchmarkMode) {
                app.invertAxis ? app.moveUp = false : app.moveDown = false;
            }
        },
        dLeft: function () {
            if (!app.inMenu && !app.benchmarkMode) {
                app.moveLeft = false;
            }
        },
        dRight: function () {
            if (!app.inMenu && !app.benchmarkMode) {
                app.moveRight = false;
            }
        },
        softLeft: function () {
            if (app.inMenu && app.currentViewName != 'viewLoading') {
                if (app.backEnabled) {
                    if (app.isInputFocused) {
                        app.activeNavItem.nextElementSibling.value = app.previous_input_value;
                        app.activeNavItem.focus();
                        app.isInputFocused = false;
                        app.update_softkeyBar();
                    } else {
                        goBack();
                    }
                }
            } else if (app.isPage) {
                goBack();
            } else if (app.gameRunning && !app.gamePaused && !app.benchmarkMode) {
                if (app.playerSelectedSpeed > 0.4) {
                    app.playerSelectedSpeed -= 0.1;
                    app.update_throttle_hud();
                }
            }
        },
        softRight: function () {
            if (app.gameRunning && !app.gamePaused && !app.benchmarkMode) {
                if (app.playerSelectedSpeed <= 0.9) {
                    app.playerSelectedSpeed += 0.1;
                    app.update_throttle_hud();
                }
            }
        },
        enter: function () {
            if (app.inMenu) {
                if (app.currentViewName != 'viewLoading') {
                    execute();
                } else if (app.currentViewName == 'viewLoading' && app.level_ready) {
                    if (app.multiplayerMode) app.join();
                    app.load_level(app.levelList[app.levelIndex], true);
                    app.currentViewName = null;
                } else {
                    console.warn('still loading');
                }
            } else if (!app.benchmarkMode) {
                app.shot_request(app.playerObject.weaponCharge);
            }
        },
        menu: function () { },
        back: function () {
            if (app.inMenu && app.currentViewName != 'viewLoading') {
                if (app.backEnabled) {
                    if (app.isInputFocused) {
                        app.activeNavItem.nextElementSibling.value = app.previous_input_value;
                        app.activeNavItem.focus();
                        app.isInputFocused = false;
                        app.update_softkeyBar();
                    } else {
                        goBack();
                    }
                }
            } else if (app.isPage) {
                goBack();
            } else {
                app.gamePaused = true;
                if (app.missionCompleted) {
                    app.menu_show('viewMissionCompleted');
                } else {
                    app.menu_show();
                }
            }
        },
        quit: function () { if (app.ws) app.ws.close(); window.close(); },
        reverse: function () { if (!app.inMenu && !app.benchmarkMode) { app.reverseView = 0; } },
        other: function () { }
    };

    // orientation changed
    window.addEventListener('resize', check_orientation);

    function check_orientation() {
        let aspect = window.innerWidth / window.innerHeight;
        if (aspect > 1) {
            app.landscapeOrientation = true;
        } else {
            app.landscapeOrientation = false;
        }
    }

    function check_page() {
        const views = document.getElementById('views');
        if (views) {
            app.isPage = false;
            navigator.spatialNavigationEnabled = false;
        } else {
            app.isPage = true;
            navigator.spatialNavigationEnabled = true;
        }
    }

    // startup
    var gameWindow;
    var viewRoot;
    var backButton;
    var actionButton;
    var optionsButton;
    var softkeyBar;
    var hud;

    window.addEventListener("focus", function () {
        check_page();
    });

    document.addEventListener("DOMContentLoaded", function () {
        check_page();
        check_orientation();

        backButton = document.getElementById("bar-back");
        actionButton = document.getElementById("bar-action");
        optionsButton = document.getElementById("bar-options");
        softkeyBar = document.getElementById("softkeyBar");

        if (!app.isPage) {
            softkeyBar.style.display = 'none';
            viewRoot = document.getElementById("views");
            gameWindow = document.getElementById("gameWindow");
            gameWindow.tabIndex = -99;

            app.views = viewRoot.querySelectorAll('.view');
            stageListContainer = document.getElementById('stageList');
            levelGridContainer = document.getElementById('levelGrid');

            hud = document.getElementById('HUD');

            app.initSettings();
            app.load_gltf();
            goToLoadingView();
            if (app.isKaiOS) checkForUpdate();
        } else {
            var appVerison = document.getElementById('appVersion');
            if (appVerison) appVerison.innerHTML = app.versionString;
            app.backEnabled = true;
            app.update_softkeyBar();
        }
    });

    // vertical navigation in increments of 10
    function navVertical(forward) {
        if (!app.isInputFocused && !app.fullAdVisible) {
            app.updateNavItems();
            // jump to tabIndex
            var next = app.currentNavId;
            next += forward ? 10 : -10;
            if (next > getNavTabIndex(app.navItems.length - 1)) {
                // if larger than last index
                next = next % 10;
                // try to stay in same column
                if (app.navItems[next]) {
                    app.focusActiveButton(app.navItems[next]);
                } else {
                    app.focusActiveButton(app.navItems[0]);
                }
            } else if (next < 0) {
                // if smaller than 0
                var lastTab = getNavTabIndex(app.navItems.length - 1);
                var rowIndex = parseInt(Math.floor(lastTab * 0.1) * 10);
                // try to stay in same column
                var columnIndex = (next + 10) % 10;
                next = rowIndex + columnIndex;
                for (var i = 0; i < app.navItems.length; i++) {
                    if (getNavTabIndex(i) == next) {
                        app.focusActiveButton(app.navItems[i]);
                        break;
                    }
                }
            } else {
                var found = false;
                for (var i = 0; i < app.navItems.length; i++) {
                    if (getNavTabIndex(i) == next) {
                        app.focusActiveButton(app.navItems[i]);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // nothing found, try start of next row
                    var round = Math.floor(next / 10) * 10;
                    for (var i = 0; i < app.navItems.length; i++) {
                        if (getNavTabIndex(i) == round) {
                            app.focusActiveButton(app.navItems[i]);
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
    };

    // horizontal navigation in increments of 1
    function navHorizontal(forward) {
        if (!app.isInputFocused && !app.fullAdVisible) {
            app.updateNavItems();
            // jump to array index for continuous horizontal navigation
            var currentTabIndex = app.currentNavId;
            for (var i = 0; i < app.navItems.length; i++) {
                if (getNavTabIndex(i) == currentTabIndex) {
                    var next = i;
                    next += forward ? 1 : -1;
                    if (next >= app.navItems.length) {
                        next = 0;
                    } else if (next < 0) {
                        next = app.navItems.length - 1;
                    }
                    app.focusActiveButton(app.navItems[next]);
                    break;
                }
            }
        }
    };

    function getNavTabIndex(i) {
        return parseInt(app.navItems[i].getAttribute('tabIndex'));
    };

    var lobby_playerCount_node = document.getElementById("lobby_playerCount");
    var activeNavItem_parent;

    app.focusActiveButton = (element) => {
        app.activeNavItem = element;

        app.activeNavItem.focus();
        app.isInputFocused = app.get_inputFocused_state();

        app.currentNavId = parseInt(app.activeNavItem.getAttribute('tabIndex'));

        activeNavItem_parent = app.activeNavItem.parentElement.id;

        // scroll to top
        if (app.currentNavId == 0) {
            try {
                app.currentView.scrollTo(0, 0);
            } catch (e) { }
        } else if (activeNavItem_parent == "lobby_list_body" || activeNavItem_parent == "lobby_list_buttons") {
            lobby_playerCount_node.scrollIntoView({ block: "start", behavior: "smooth" });
        } else {
            app.activeNavItem.scrollIntoView({ block: "start", behavior: "smooth" });
        }
        app.update_softkeyBar();
    };

    app.getActiveNavItemIndex = function () {
        for (var i = 0; i < app.navItems.length; i++) {
            var found = false;
            if (app.activeNavItem) {
                if (app.activeNavItem.getAttribute('id') == app.navItems[i].getAttribute('id')) {
                    found = true;
                    break;
                }
            }
        }
        if (found) {
            return i;
        } else {
            return 0;
        }
    }

    var nextLevelIndex = 0;

    function execute() {
        if (!app.fullAdVisible) {
            if (!app.isInputFocused) { /* NOT in some input field */
                if (app.activeNavItem.getAttribute('data-gotToViewId')) {
                    navHistory(true);
                    app.prevMenuId = app.currentNavId;
                    app.showView(app.activeNavItem.getAttribute('data-gotToViewId'));
                    app.initView();
                } else if (app.activeNavItem.getAttribute('data-goToViewName')) {
                    let navIndex = -1;
                    if (app.activeNavItem.getAttribute('data-goToViewName') == 'viewStages') {
                        // focus last played stage
                        if (window.localStorage.getItem('stageIndex')) {
                            navIndex = window.localStorage.getItem('stageIndex');
                            navIndex = parseInt(navIndex);
                        }
                        app.populateStageList(stageListContainer);
                    } else if (app.activeNavItem.getAttribute('data-goToViewName') == 'viewLevels') {
                        // focus last played level
                        app.populateLevelGrid(levelGridContainer, Math.round(app.currentNavId / 10));
                    }
                    navHistory(true);
                    app.prevMenuId = app.currentNavId;
                    showViewByName(app.activeNavItem.getAttribute('data-goToViewName'));
                    if (navIndex >= 0) {
                        app.initView(navIndex);
                    } else {
                        app.initView();
                    }
                } else if (app.activeNavItem.getAttribute('data-href')) {
                    openURL(app.activeNavItem.getAttribute('data-href'));
                } else if (app.activeNavItem.getAttribute('data-getID')) {
                    let get_idStats = parseInt(app.activeNavItem.getAttribute('data-getID'));
                    app.get_gameStats(get_idStats);
                    app.gameID = get_idStats;
                } else if (app.activeNavItem.getAttribute('data-joinID')) {
                    app.gameID = parseInt(app.activeNavItem.getAttribute('data-joinID'));
                    app.multiplayerMode = true;
                    if (app.benchmarkMode) {
                        app.benchmarkMode = false;
                        app.reset_benchmark();
                    }
                    if (app.mp_join_released) {
                        app.prevMenuId = 0;
                        app.load_level(app.level_mp_deathmatch, true);
                        goToLoadingView();
                    }
                } else if (app.activeNavItem.getAttribute('data-function')) {
                    let call = app.activeNavItem.getAttribute('data-function');
                    let navItem_levelIndex = app.activeNavItem.getAttribute('data-level');
                    switch (call) {
                        case 'play':
                            if (!navItem_levelIndex) break;
                            navItem_levelIndex = parseFloat(navItem_levelIndex);
                            app.levelIndex = navItem_levelIndex;
                            if (app.benchmarkMode) {
                                app.benchmarkMode = false;
                                app.reset_benchmark();
                            }
                            if (app.multiplayerMode) {
                                app.previous_stage = -1; // reset stage to force asset loading
                                app.multiplayerMode = false;
                            }
                            app.load_level(app.levelList[navItem_levelIndex], true);
                            nextLevelIndex = navItem_levelIndex + 1;
                            goToLoadingView();
                            break;
                        case 'nextLevel':
                            app.levelIndex = nextLevelIndex;
                            nextLevelIndex = app.levelIndex + 1;
                            app.load_level(app.levelList[app.levelIndex], true);
                            goToLoadingView();
                            break;
                        case 'benchmark':
                            app.benchmarkMode = true;
                            if (app.multiplayerMode) {
                                app.previous_stage = -1; // reset stage to force asset loading
                                app.multiplayerMode = false;
                            }
                            app.load_level(app.level_benchmark, true);
                            app.reset_benchmark();
                            goToLoadingView();
                            break;
                        case 'mp_name':
                            app.mp_enter_name();
                            break;
                        case 'reset':
                            if (!app.gameRunning || app.multiplayerMode) return;
                            if (app.benchmarkMode) {
                                app.load_level(app.level_benchmark, true);
                                app.reset_benchmark();
                            } else {
                                app.load_level(app.level, true);
                            }
                            goToLoadingView();
                            break;
                        case 'resume':
                            // prevent resume when graphics settings changed
                            if (!app.require_reset && !app.multiplayerMode) {
                                app.menu_close();
                                navHistory(true);
                                app.currentViewName = null;
                                app.gamePaused = false;
                            }
                            break;
                        case 'quit':
                            window.close();
                            break;
                        case 'deleteProgress':
                            app.deleteProgress();
                            break;
                        case 'llNext':
                            app.set_lobbyPage(true);
                            break;
                        case 'llPrev':
                            app.set_lobbyPage(false);
                            break;
                    }
                } else if (app.activeNavItem.tagName.toLowerCase() == 'legend') {
                    // select input field next to the legend
                    app.activeNavItem.nextElementSibling.focus();
                    app.previous_input_value = app.activeNavItem.nextElementSibling.value;
                } else if (app.currentViewName == 'viewLeaderboard') {
                    app.upload_lb_score();
                } else {
                    console.log('nothing to execute');
                }
            } else { /* in some input field */
                if (app.currentViewName == 'viewSettings') {
                    app.updateSettings();
                } else if (app.currentViewName == 'onlineLobby') {
                    let tab = app.activeNavItem.tabIndex;
                    if (tab == 0) app.mp_updateSelection();
                }
                // return to legend when input confirmed to avoid triggering the input again
                app.activeNavItem.focus();
            }
            // update soft keys
            app.isInputFocused = app.get_inputFocused_state();
            app.update_softkeyBar();
        }
    }

    function goToLoadingView() {
        navHistory(true);
        app.showView(0); // viewLoading
        app.initView();
    }

    var menu_show_timeout;

    app.menu_show = function (viewName, delay) {
        clearTimeout(menu_show_timeout);
        // reset move
        app.moveUp = app.moveDown = app.moveLeft = app.moveRight = false;
        if (app.chargeInterval) clearInterval(app.chargeInterval);
        app.playerObject.weaponCharge = 0;

        menu_show_timeout = setTimeout(function () {
            app.inMenu = true;
            viewRoot.style.display = 'block';
            if (viewName) {
                navDepth = 0;
                showViewByName(viewName);
            } else {
                app.goBackInHistory = true;
                navHistory(false);
                app.showView(app.prevViewId[navDepth]);
            }
            app.initView();
            app.gamePaused = true;

            // stop audio
            if (app.soundfx_on) app.stop_level_audio();
        }, delay);
    }

    app.menu_close = function () {
        app.inMenu = false;
        viewRoot.style.display = 'none';
        gameWindow.style.display = 'block';

        // start audio
        if (app.soundfx_on) app.start_level_audio();
    }

    function goBack() {
        app.goBackInHistory = true;
        navigator.spatialNavigationEnabled = false;
        if (app.isPage) {
            window.history.back();
        } else {
            if (!app.isInputFocused && !app.fullAdVisible && app.backEnabled) {
                navHistory(false);

                // main menu id mapping 
                switch (app.currentViewName) {
                    case 'viewStages':
                        app.prevMenuId = 0;
                        break;
                    case 'onlineLobby':
                        app.prevMenuId = 30;
                        if (app.ws) app.ws.close();
                        break;
                    case 'viewLeaderboard':
                        app.prevMenuId = 40;
                        break;
                    case 'viewSettings':
                        app.prevMenuId = 60;
                        break;
                }
                app.showView(app.prevViewId[navDepth]);
                app.initView();
            }
        }
    }

    function navHistory(goDown) {
        app.prevViewId[navDepth] = app.currentViewID;
        if (goDown) {
            navDepth++;
        } else {
            navDepth--;
        }
    }

    app.get_inputFocused_state = function () {
        var activeTag = document.activeElement.tagName.toLowerCase();
        var isInput = false;
        // the focus switches to the 'body' element for system ui overlays
        if (activeTag == 'input' || activeTag == 'select' || activeTag == 'text' || activeTag == 'textarea' || activeTag == 'body' || activeTag == 'html' || app.promptActive) {
            isInput = true;
        }
        return isInput;
    };

    // use the index to navigate to the view
    app.showView = function (index) {
        // switch active view
        for (let i = 0; i < app.views.length; i++) {
            app.views[i].classList.remove('active');
        }
        app.currentView = app.views[index];
        app.currentView.classList.add('active');
        app.currentViewID = index;
        app.currentViewName = app.currentView.getAttribute("id");
    }

    // use the view's name
    function showViewByName(name) {
        var viewIndex = 0;
        // switch active view
        for (let i = 0; i < app.views.length; i++) {
            app.views[i].classList.remove('active');
            // search for name
            if (name == app.views[i].id) {
                viewIndex = i;
            }
        }
        app.currentView = app.views[viewIndex];
        app.currentView.classList.add('active');
        app.currentViewID = viewIndex;
        app.currentViewName = name;
    }

    function openURL(url) {
        var external = url.includes('http');
        if (external) {
            window.open(url, '_blank');
        } else {
            window.location.assign(url);
        }
    }

    const button_resume = document.getElementById('button_resume');
    const button_reset = document.getElementById('button_reset');
    const lobby_badge_container = document.getElementById("lobby_badge_container");

    app.initView = function (navIndex) {
        app.currentView.scrollTo(0, 0);
        // enable back button
        if (app.currentViewName != 'viewMenu' && app.currentViewName != 'viewGameOver' && app.currentViewName != 'viewMissionCompleted' && app.currentViewName != 'viewLoading') {
            app.backEnabled = true;
        } else {
            app.backEnabled = false;
        }

        if (app.currentViewName == 'viewLeaderboard') {
            app.file_read(false, () => {
                app.lb_get();
            });
        }

        if (app.currentViewName == 'onlineLobby') {
            app.file_read(false, () => {
                app.connect(false);
                app.showBadges(lobby_badge_container, app.playerObject.killScore, 'profile', app.playerObject.mpLeader);
            });
        }

        // button states
        if (app.currentViewName == 'viewMenu') {
            if (app.gameRunning) {
                if (app.require_reset || app.multiplayerMode) {
                    button_resume.className = 'navItem';
                    button_resume.classList.add('locked');
                } else {
                    button_resume.className = 'navItem';
                }
                if (app.multiplayerMode) {
                    button_reset.className = 'navItem';
                    button_reset.classList.add('locked');
                } else {
                    button_reset.classList.remove('locked');
                }
            }
        }

        // focus first or previous menu entry
        if (app.currentView.querySelector(".navItem")) {
            app.updateNavItems();
            if (navIndex) {
                app.focusActiveButton(app.navItems[navIndex]);
            } else {
                if (app.goBackInHistory) {
                    app.goBackInHistory = false;
                    app.focusTabIndex(app.prevMenuId);
                } else {
                    app.focusActiveButton(app.navItems[0]);
                }
            }
        }
        softkeyBar.style.display = 'block';

        app.refresh_totalScore();
    }

    // fill navigation array for current view
    app.updateNavItems = function (index) {
        app.navItems = app.currentView.querySelectorAll('.navItem');
    }

    app.focusTabIndex = function (index) {
        for (var t = 0; t < app.navItems.length; t++) {
            if (app.navItems[t].getAttribute('tabIndex') == index) {
                app.focusActiveButton(app.navItems[t]);
                break;
            }
        }
    };

    // set soft keys
    app.update_softkeyBar = function () {
        if (app.backEnabled) {
            backButton.innerHTML = app.isInputFocused ? "CANCEL" : "BACK";
        } else {
            backButton.innerHTML = "";
        }

        if (app.currentViewName == 'viewLoading') {
            (app.level_ready) ? actionButton.innerHTML = "PLAY" : actionButton.innerHTML = "loading...";
        } else if (app.currentViewName == 'viewLeaderboard') {
            actionButton.innerHTML = "UPDATE";
        } else if (!app.isPage) {
            actionButton.innerHTML = "SELECT";
        } else {
            actionButton.innerHTML = "";
        }
    }

    var body = document.getElementsByTagName('body');

    // re-enable input after prompt is gone
    app.postPromptDelay = function () {
        setTimeout(function () {
            app.promptActive = false;
            app.isInputFocused = false;
            if (app.currentNavId < 0) {
                app.currentNavId = 0;
            }
            app.focusTabIndex(app.currentNavId);
        }, 200);
    }

    return app;
}());

