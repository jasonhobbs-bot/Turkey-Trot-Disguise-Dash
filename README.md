# TURKEY TROT: DISGUISE DASH — GITHUB DELUXE

An original Thanksgiving-themed kart-racing game for iPad, Chromebook, and desktop browsers.

## What's improved

- **12 unique illustrated environments**, with their own scenic SVG assets, track-specific road colors, hazards, and different curves.
- **12 turkey disguises** (Superhero, Astronaut, Ninja, Pirate, Wizard, Chef, Robot, Detective, Dinosaur, Unicorn, Cowboy, Knight), each on its own custom-colored kart.
- Redesigned glossy kart art, rear-view racers during the race, and dynamic corn-boost effects.
- More of the screen is race scenery: slimmer HUD, translucent steering buttons, bigger racing canvas.
- **3 laps on every track**, race stopwatch, lap times, first-through-eighth place, finish podium.
- 7 CPU racers in **Solo Grand Prix**. This mode works immediately, without accounts or server setup.
- **Classroom multiplayer** (up to 8 students on separate devices) once Firebase is connected.

## Upload to GitHub Pages

1. Unzip the archive.
2. Open your GitHub repository, then **Add file → Upload files**.
3. Upload **all the files and folders inside** this ZIP to the repository root (do not upload the ZIP itself). The homepage must be named exactly **`index.html`** in lowercase. Keep `assets/scenes` intact.
4. Commit changes, then under **Settings → Pages**, set **Deploy from a branch**, choose the appropriate branch (usually `main`) and root folder `/`.
5. Open the GitHub Pages URL for your repository. Solo mode works without any extra setup.

**Important:** Updating the `index.html` only and leaving out the `assets` directory will result in missing scenery. GitHub Pages is static hosting; paying for GitHub does **not** itself provide the shared database needed for live classroom racing.

## OPTIONAL: Turn on real classroom multiplayer with Firebase

A shared backend is necessary for two or more devices to join the same race. This release supports Firebase Realtime Database and anonymous Firebase sign-in, without requiring each student to create a user account. Firebase has quotas; check your plan and district approval before classroom use.

1. Open <https://console.firebase.google.com/> and create a Firebase project for this game. Check district policy before uploading student information to a third-party service.
2. In **Build → Authentication → Sign-in method**, enable **Anonymous**.
3. In **Build → Realtime Database**, create a database. Make note of its exact **database URL**, including its regional suffix. Do not use an open `".read":true, ".write":true` test rule.
4. In **Realtime Database → Rules**, replace the rules with the contents of **`firebase-rules.json`**, then publish. Review the rules with your district's technology staff before use; this is a classroom prototype and is not a hardened production server.
5. In **Project settings → General → Your apps**, add a **Web app** and copy the Firebase web configuration into **`firebase-config.js`**, filling in `apiKey`, `authDomain`, `databaseURL`, `projectId`, and `appId`.
6. Upload the edited `firebase-config.js` to your GitHub repository and commit. **Do not put service account keys, administrator tokens or passwords into the file.** Firebase web config identifiers are designed to be public; security must come from Authentication and Database Rules.
7. Open the GitHub Pages game on two devices. On the first, choose **Race With Classmates → Create a Room**; on the second, choose **Join** with the five-character code. Both select **Ready**, then the host starts the race. Everyone should see the same course, countdown, positions and finishing order.

Student data stored: anonymous Firebase UID, short racing nickname, costume ID, track ID, ready state, distance, lane, and finish time. Do not use full student names. Rooms have a six-hour logical expiration in the client; Firebase does **not** automatically purge expired records without an additional cleanup process, so delete old rooms from the console periodically.

**Limitations:** Finish times are submitted by the clients and are not authoritative; fairness is suitable for a classroom party, not a tournament with prizes. Firebase rules restrict writes by authenticated UID but are not designed to prevent every form of misuse. Multiplayer requires a functional connection to Firebase and is not fully tested across different school devices in this package.

## Controls

- **iPad / touchscreen:** hold ◀ or ▶ to steer and tap **BOOST** after collecting three corn pickups.
- **Chromebook / PC:** ← and → arrows (or A/D) to steer; **Space** to boost; **P** to pause Solo.
- All tracks are three laps. Crossing the line finishes the race and shows results with lap times.

## Files

- `index.html` — all menus, race engine, graphics rendering, scores and controls.
- `assets/scenes/track-01.svg` through `track-12.svg` — the twelve scenic backgrounds.
- `assets/hero-racers.webp` — illustrated main-menu artwork.
- `firebase-config.js` — optional classroom Firebase configuration (blank by default).
- `firebase-backend.js` — optional Firebase multiplayer adapter.
- `firebase-rules.json` — recommended initial Realtime Database rules.

### Testing status

The JavaScript has passed a syntax check and the SVG scene assets have passed XML validation. I was not able to run a full browser interaction test in this environment, so check the game on one laptop and one iPad before using it in class. Browser support, Firebase connectivity, real-time device synchronization and network restrictions still need live testing.
