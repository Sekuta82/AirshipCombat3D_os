# AirshipCombat3D OpenSource Edition

## Client
The client runs on KaiOS 2.x and on desktop in an older Firefox-Version (e.g. 52), which is also required to push the app onto the device.
The game is written in vanilla JS without any abstraction. Is relies on Three.js for all 3D related things.

To use the online leaderboard, you will need a database server. This is independent from the server application.
Look for all server-related settings inside the lb_backend and client folder.

## Server
The online multiplayer is a node application. Just install all modules and deploy it on your own node-server.
All URLs to the servers have been replaced with [DOMAIN]. Just search the code to find it.
The server will only accept connections from a kaios user agent + a domain exception you can specify.

The application is being provided as is! Please don't contact me for technical support! Thank you!

Enjoy looking through messy code and improve on it!

My version of the game is available on KaiOS devices through the KaiStore.
https://www.kaiostech.com/store/apps/?bundle_id=de.ays-arts.airshipcombat3d