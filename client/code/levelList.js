(function (app) {

    // stages
    app.stageList = [];

    app.stage = {
        name: '',
        title: '',
        stageIndex: null,
        levelCount: null,
        terrainHeight: 1
    }

    app.stage_grasslands = {
        name: 'grasslands',
        title: 'Grasslands',
        stageIndex: app.stages.grasslands,
        levelCount: 0,
        terrainHeight: 120
    }
    app.stageList[app.stages.grasslands] = app.stage_grasslands;

    app.stage_lava = {
        name: 'lava',
        title: 'Volcano',
        stageIndex: app.stages.lava,
        levelCount: 0,
        terrainHeight: 80
    }
    app.stageList[app.stages.lava] = app.stage_lava;

    app.stage_desert = {
        name: 'desert',
        title: 'Lindworm',
        stageIndex: app.stages.desert,
        levelCount: 0,
        terrainHeight: 160
    }
    app.stageList[app.stages.desert] = app.stage_desert;

    app.stage_space = {
        name: 'space',
        title: 'Another<br/>World',
        stageIndex: app.stages.space,
        levelCount: 0,
        terrainHeight: 1
    }
    app.stageList[app.stages.space] = app.stage_space;

    app.stage_tbc = {
        name: 'tbc',
        title: 'More to come...',
        stageIndex: app.stages.tbc,
        levelCount: 0,
        terrainHeight: 1
    }
    app.stageList[app.stages.tbc] = app.stage_tbc;

    // ================================================================= //

    app.level = {
        name: '',
        difficulty: null,
        stageIndex: null,
        mission: null,
        turrets: false,
        fighters: false,
        maxFighters: null,
        playerStartPosition: null,
        destination: null,
        destinationPosition: null,
        timer: null,
        briefing: ['']
    }

    app.level_benchmark = {
        name: 'benchmark',
        difficulty: 0,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.fortress,
        turrets: true,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(0, 180, 0),
        destination: app.destinations.fortress,
        destinationPosition: new THREE.Vector3(150, 200, 1300),
        timer: null,
        briefing: ['performance benchmark', 'stand back', 'enjoy the ride']
    }

    app.level_mp_deathmatch = {
        name: 'multiplayer',
        difficulty: 0,
        stageIndex: app.mp_stage,
        mission: app.missionTypes.mp_deathmatch,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(0, 180, 0),
        destination: null,
        destinationPosition: null,
        timer: null,
        briefing: ['multiplayer deathmatch']
    }

    app.levelList = [];
    // ================================================================= //
    // stage 0: grasslands

    app.s0_level_travel_turrets = {
        name: 'drop off',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.travel,
        turrets: true,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(1000, 200, 0),
        destination: app.destinations.platform,
        destinationPosition: new THREE.Vector3(2000, 0, -4000),
        timer: null,
        briefing: [
            'so, this is your first mission?',
            'do me a favor, try not to kill yourself on the first day, will you?',
            'you see that bright green dot at the bottom?',
            'follow it!',
            'it will guide you to your destination',
        ]
    }
    app.levelList.push(app.s0_level_travel_turrets);
    app.stage_grasslands.levelCount++;

    app.s0_level_travel_fighters = {
        name: 'ambush',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.travel,
        turrets: false,
        fighters: true,
        maxFighters: 10,
        playerStartPosition: new THREE.Vector3(1000, 400, 100),
        destination: app.destinations.platform,
        destinationPosition: new THREE.Vector3(-5000, 0, 1000),
        timer: null,
        briefing: [
            'ok, this should be an easy job',
            'even for you',
            'we need to get back, asap!',
            'don\'t attract any attention'
        ]
    }
    app.levelList.push(app.s0_level_travel_fighters);
    app.stage_grasslands.levelCount++;

    app.s0_level_survival_fighters = {
        name: 'survival',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.survival,
        turrets: false,
        fighters: true,
        maxFighters: 100,
        playerStartPosition: new THREE.Vector3(2000, 250, -1000),
        destination: null,
        destinationPosition: null,
        timer: 90,
        briefing: [
            'hey, pilot boy',
            'the sky is full of those gastly pirates',
            'keep them busy for a while, will you?'
        ]
    }
    app.levelList.push(app.s0_level_survival_fighters);
    app.stage_grasslands.levelCount++;

    app.s0_level_travel_fighters_medium = {
        name: 'ambush',
        difficulty: app.difficulty.medium,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.travel,
        turrets: false,
        fighters: true,
        maxFighters: 10,
        playerStartPosition: new THREE.Vector3(-2000, 50, 500),
        destination: app.destinations.platform,
        destinationPosition: new THREE.Vector3(3000, 0, -1000),
        timer: null,
        briefing: [
            'more pirates!',
            'can you handle some more?',
        ]
    }
    app.levelList.push(app.s0_level_travel_fighters_medium);
    app.stage_grasslands.levelCount++;

    app.s0_level_fortress_medium = {
        name: 'fortress',
        difficulty: app.difficulty.medium,
        stageIndex: app.stages.grasslands,
        mission: app.missionTypes.fortress,
        turrets: true,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(0, 200, 0),
        destination: app.destinations.fortress,
        destinationPosition: new THREE.Vector3(2000, 250, -3000),
        timer: null,
        briefing: [
            'thanks for not crashing the ship',
            'they located a huge pirate vessel',
            'we ... you have to stop it!',
            'how big can it be?',
            'let\'s find out'
        ]
    }
    app.levelList.push(app.s0_level_fortress_medium);
    app.stage_grasslands.levelCount++;

    // ================================================================= //
    // stage 1: lava

    app.s1_level_survival_fighters = {
        name: 'survival',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.lava,
        mission: app.missionTypes.survival,
        turrets: false,
        fighters: true,
        maxFighters: 100,
        playerStartPosition: new THREE.Vector3(2000, 200, 1000),
        destination: null,
        destinationPosition: null,
        timer: 120,
        briefing: [
            'they have followed us here',
            'you know what to do',
            'don\'t burn yourself'
        ]
    }
    app.levelList.push(app.s1_level_survival_fighters);
    app.stage_lava.levelCount++;

    app.s1_level_travel_turrets = {
        name: 'drop off',
        difficulty: app.difficulty.medium,
        stageIndex: app.stages.lava,
        mission: app.missionTypes.travel,
        turrets: true,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(1000, 300, 0),
        destination: app.destinations.volcano,
        destinationPosition: new THREE.Vector3(-2000, 400, -4000),
        timer: null,
        briefing: [
            'we need to reach that volcano',
            'it should be safe',
            'but you never know'
        ]
    }
    app.levelList.push(app.s1_level_travel_turrets);
    app.stage_lava.levelCount++;

    app.s1_level_fortress_easy = {
        name: 'fortress',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.lava,
        mission: app.missionTypes.fortress,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(1000, 150, 0),
        destination: app.destinations.fortress,
        destinationPosition: new THREE.Vector3(3000, 0, -4000),
        timer: null,
        briefing: [
            'we have a huge problem',
            'one of their tanks has been spotted',
            'take it down!'
        ]
    }
    app.levelList.push(app.s1_level_fortress_easy);
    app.stage_lava.levelCount++;

    app.s1_level_travel_fighters_medium = {
        name: 'ambush',
        difficulty: app.difficulty.medium,
        stageIndex: app.stages.lava,
        mission: app.missionTypes.travel,
        turrets: false,
        fighters: true,
        maxFighters: 10,
        playerStartPosition: new THREE.Vector3(2000, 100, 500),
        destination: app.destinations.volcano,
        destinationPosition: new THREE.Vector3(-3000, 400, -3000),
        timer: null,
        briefing: [
            'they didn\'t look too happy when we kicked their asses',
            'even more pirates polluting the air',
            'let\'s dance!'
        ]
    }
    app.levelList.push(app.s1_level_travel_fighters_medium);
    app.stage_lava.levelCount++;

    app.s1_level_fortress_hard = {
        name: 'fortress',
        difficulty: app.difficulty.hard,
        stageIndex: app.stages.lava,
        mission: app.missionTypes.fortress,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(100, 150, 0),
        destination: app.destinations.fortress,
        destinationPosition: new THREE.Vector3(-4000, 0, 2000),
        timer: null,
        briefing: [
            'good news',
            'turns out, that wasn\'t their only tank',
            'be more careful this time',
            'it\'s a litte bit more... commited',
        ]
    }
    app.levelList.push(app.s1_level_fortress_hard);
    app.stage_lava.levelCount++;

    // ================================================================= //
    // stage 2: desert

    app.s2_level_survival_fighters_medium = {
        name: 'survival',
        difficulty: app.difficulty.medium,
        stageIndex: app.stages.desert,
        mission: app.missionTypes.survival,
        turrets: false,
        fighters: true,
        maxFighters: 100,
        playerStartPosition: new THREE.Vector3(2000, 100, -3000),
        destination: null,
        destinationPosition: null,
        timer: 160,
        briefing: [
            'a hot desert, finally!',
            'anything is nicer than that big ol\' volcano',
            'ships incoming!',
            'those pirates need a little distraction',
        ]
    }
    app.levelList.push(app.s2_level_survival_fighters_medium);
    app.stage_desert.levelCount++;

    app.s2_level_travel_turrets_hard = {
        name: 'drop off',
        difficulty: app.difficulty.hard,
        stageIndex: app.stages.desert,
        mission: app.missionTypes.travel,
        turrets: true,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(1000, 300, 0),
        destination: app.destinations.platform,
        destinationPosition: new THREE.Vector3(2000, 0, -4000),
        timer: null,
        briefing: [
            'you know what they say about this place?',
            'it\'s the home of the Lind',
            'an ancient creature living in the sands',
            'superstitious fools'
        ]
    }
    app.levelList.push(app.s2_level_travel_turrets_hard);
    app.stage_desert.levelCount++;

    app.s2_level_boss = {
        name: 'boss',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.desert,
        mission: app.missionTypes.boss,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(1000, 200, -500),
        destination: null,
        destinationPosition: null,
        timer: null,
        briefing: [
            'do you hear that?',
            'look!'
        ]
    }
    app.levelList.push(app.s2_level_boss);
    app.stage_desert.levelCount++;

    app.s2_level_boss_hard = {
        name: 'boss',
        difficulty: app.difficulty.hard,
        stageIndex: app.stages.desert,
        mission: app.missionTypes.boss,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(-2000, 200, -500),
        destination: null,
        destinationPosition: null,
        timer: null,
        briefing: [
            'that was tough',
            'seriously? another one?'
        ]
    }
    app.levelList.push(app.s2_level_boss_hard);
    app.stage_desert.levelCount++;

    app.s2_level_travel_fighters_hard = {
        name: 'ambush',
        difficulty: app.difficulty.hard,
        stageIndex: app.stages.desert,
        mission: app.missionTypes.travel,
        turrets: false,
        fighters: true,
        maxFighters: 10,
        playerStartPosition: new THREE.Vector3(-1000, 250, 500),
        destination: app.destinations.platform,
        destinationPosition: new THREE.Vector3(-6000, 0, 3000),
        timer: null,
        briefing: [
            'let\'s get out of here',
            'I\'m sick of this place ',
        ]
    }
    app.levelList.push(app.s2_level_travel_fighters_hard);
    app.stage_desert.levelCount++;

    // ================================================================= //
    // stage 2: space

    app.s3_level_race = {
        name: 'race',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.space,
        mission: app.missionTypes.race,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(10, 10, 10),
        destination: app.destinations.planet,
        destinationPosition: new THREE.Vector3(100000, -50000, -250000),
        timer: 70,
        briefing: [
            'welcome to space',
            'this ship is a lot faster',
            'remember not to crash it'
        ]
    }
    app.levelList.push(app.s3_level_race);
    app.stage_space.levelCount++;

    app.s3_level_boss = {
        name: 'boss',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.space,
        mission: app.missionTypes.boss,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(10, 10, 10),
        destination: app.destinations.orb,
        destinationPosition: new THREE.Vector3(2000, -200, -4000),
        timer: null,
        briefing: [
            'you need to stop that ship',
            'if it reaches the surface, we are done'
        ]
    }
    app.levelList.push(app.s3_level_boss);
    app.stage_space.levelCount++;

    app.s3_level_end = {
        name: 'the end',
        difficulty: app.difficulty.easy,
        stageIndex: app.stages.space,
        mission: app.missionTypes.sandbox,
        turrets: false,
        fighters: false,
        maxFighters: 0,
        playerStartPosition: new THREE.Vector3(10, 10, 10),
        destination: null,
        destinationPosition: null,
        timer: null,
        briefing: [
            'you have reached...',
            'THE END',
            'thank you for playing!',
            'more levels to come',
            'check the store for updates in the future',
            'go ahead, build your own game',
            'you can do it!',
            ' ',
            'Another game by:',
            'Christian Waadt'
        ]
    }
    app.levelList.push(app.s3_level_end);
    app.stage_space.levelCount++;

    return app;
}(MODULE));