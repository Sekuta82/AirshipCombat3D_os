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

![benchmark](https://user-images.githubusercontent.com/47293702/155005982-1a293b38-56c7-4e7c-b03c-759905c95765.png)
![desert](https://user-images.githubusercontent.com/47293702/155005991-ef735341-3380-41ae-a1f1-aaa3e14480c1.png)
![grasslands](https://user-images.githubusercontent.com/47293702/155005996-1a12d10a-14af-4b38-9dcf-85430f1702b2.png)
![lava](https://user-images.githubusercontent.com/47293702/155006001-8c711360-5926-4c85-a75a-3d76f73c48cd.png)
![online_dm](https://user-images.githubusercontent.com/47293702/155006004-58cbc9a1-dc3b-4c24-a7c0-c2f6d3f7a394.png)
![online_dm2](https://user-images.githubusercontent.com/47293702/155006007-2ac64f34-43a0-4ef6-ad68-62a96a13d406.png)
![space](https://user-images.githubusercontent.com/47293702/155006011-62c9cd9e-7965-44a6-b980-a480732cb05c.png)
