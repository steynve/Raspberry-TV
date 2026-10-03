# Raspberry

An open-source application for personal use: a TV dashboard for a Raspberry Pi kiosk, with a nature photo that follows the season and the weather, internet radio, a clock, the sky, the weather and the Pi's own health.

## What it does

A Raspberry Pi boots into Chromium in kiosk mode and loads this app from its own lighttpd server. The Pi is connected to the living room TV over HDMI, and the TV remote controls the app through HDMI-CEC (`pi/hdmicec.sh` translates remote buttons into key presses, and tells the app when the TV turns on or switches to the Pi).

The screen is a full-screen photo with the clock top-left, what's playing top-right and the weather along the bottom. The middle stays free for the photo, unless rain is coming:

| Part         | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Source                                                                                                   | Refreshes                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- |
| Wallpaper    | A nature photo matching the season and the weather (mist, rain, snow, storm, sun, a starry sky on clear nights), a different one each day. Its average colour tints the UI accent                                                                                                                                                                                                                                                                                                                                                  | [Pexels](https://www.pexels.com/api/) (API key)                                                          | Photos weekly, day 6-hourly |
| Clock        | Date and time, in English with a 24-hour clock                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Local                                                                                                    | Every minute                |
| Bins         | What to do with the bins, under the clock and on the idle screen, one line each: "Out tonight: green bin (GFT) · paper" from noon the day before, "Out now: …" on the morning itself until noon, and "Back in: …" from noon on the day. On evenings you might not be home (`waste_away_evenings` in the environment) the bins go out earlier and come in later: on Sunday "Out tonight: grey bin for Monday · plastic (PMD) for Tuesday", which stays until the evening before, and on Tuesday "Back in: grey bin · plastic (PMD)" | [Area Reiniging](https://www.area-afval.nl/hoogeveen)'s calendar for your address, on Ximmio's waste API | Every 6 hours               |
| Sky          | By day the daylight left and the golden hour, at night the moon phase, how clear the night is and the next sunrise. Northern lights when tonight's Kp is 6 or higher. Below it: whether the sunset will be colourful, how fast the days are changing, and when the sky is dark and clear enough for stargazing                                                                                                                                                                                                                     | Open-Meteo, [NOAA](https://www.swpc.noaa.gov/) Kp forecast, the moon phase is calculated locally         | Every minute                |
| Radio        | Plays an internet radio station over the TV speakers, or Spotify cast from a phone (with its album cover), with the current song and artist, and the last 5 songs in the channel list                                                                                                                                                                                                                                                                                                                                              | KINK, FLUX FM and DNB Radio "now playing" APIs, Spotify Connect on the Pi                                | Every 30 seconds            |
| Now          | Temperature, conditions, wind and gusts, trail conditions, the best time to ride, whether it stays dry, UV from 5, and tree/grass/weed pollen on a 0–10 scale                                                                                                                                                                                                                                                                                                                                                                      | [Open-Meteo](https://open-meteo.com/) forecast and air quality                                           | Every 5 minutes             |
| Next 2 hours | Only when rain is coming: when it starts or stops, with a precipitation profile in 15 minute steps                                                                                                                                                                                                                                                                                                                                                                                                                                 | Open-Meteo                                                                                               | Every 5 minutes             |
| This week    | Five days with conditions, chance of rain and temperature range                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Open-Meteo                                                                                               | Every 5 minutes             |
| Raspberry Pi | Temperature, load, memory, storage and uptime in the channel list, and a warning top-right when something is wrong                                                                                                                                                                                                                                                                                                                                                                                                                 | `health.json`, written by `pi/pi-health.sh`                                                              | Every minute                |

The trail conditions are an estimate: a water balance over the last 48 hours, where rain adds water and evaporation (ET₀) removes it. 1 mm or more left means "wet", 4 mm or more "muddy". Tune the thresholds in `src/app/data/utils/outdoors.ts` to your local trails.

The best time to ride is the longest stretch of what's left of today's daylight (after sunset: tomorrow's) without rain (under 0.1 mm, and a chance under 35%) or gusts of 50 km/h and up, which bring down branches in the woods. It needs at least an hour and a half to count as a ride. Same file.

The sky notes are rules of thumb too, in `src/app/data/utils/sky.ts`:

- **Sunset colour**: mid and high clouds catch the light after the sun has set, as long as low clouds and rain don't block the horizon. 30–75% upper cloud over less than 30% low cloud means "vivid", a wider range "some colour".
- **Daylight**: tomorrow's day length against today's, "Gaining 2 min of daylight a day" or "Losing 4 min". Around the solstices, when it barely changes, "Longest days of the year" or "Shortest days of the year".
- **Stargazing**: the longest stretch of the night (at least an hour and a half) with the sun at least 12° below the horizon, less than 25% cloud, and the moon down or less than 30% lit. Sun and moon positions come from [suncalc](https://github.com/mourner/suncalc).

After sunset the photo dims and the text softens, so the TV doesn't light up the room at night.

### Idle

After 10 minutes without a remote button press, or straight away with the Back button, the dashboard fades out and the photo fades almost to black. What stays is a dim corner with the time, the song that's playing and the weather: calm enough to leave on all day. Any button, the TV turning on, or the TV switching its input back to the Pi brings the dashboard back. The first button press only wakes it, so it never opens the channel list or goes back to idle by accident.

The TV events come from HDMI-CEC: `pi/hdmicec.sh` sends the app an F13 key press (no remote button sends it) when the TV switches to the Pi, or turns on while the Pi was the input it showed last. It reads the raw CEC messages rather than libcec's notices about them, which came late or not at all:

- The TV picking an input (Set Stream Path `0f:86`, Routing Change `0f:80`) or a device saying it's on screen (Active Source `82`) tells which input it shows.
- The TV's first message when it turns on is its address (`0f:84:00:00:00`). It comes back on the input it showed last, so if that was the Pi, the app wakes right then.
- Next the TV asks which device is on screen (`0f:85`). libcec forgets over a standby that it was, so the bridge answers for it (`as`), and the TV settles on the Pi without waiting.
- The TV's standby broadcast (`0f:36`) puts the app to sleep at once.

cec-client registers as a playback device called Raspberry (`-t p -o Raspberry`, like a Chromecast), the name the TV shows in its list of inputs. To see the raw messages yourself, run `cec-client -t p -o Raspberry` on the Pi after stopping the running one (`pkill -x cec-client`; the next kiosk restart starts it again). The timeout is `IDLE_AFTER` in `src/app/features/tv/tv.component.ts`.

### Spotify

The Pi plays Spotify two ways. It's signed in to one account, so the remote can play its playlists without a phone. And it's a Spotify Connect device called **Raspberry**, like the TV or a speaker: in the Spotify app, pick Raspberry as the device and it plays on the TV. It needs Spotify Premium. On the TV, Spotify is the last entry in the channel list:

- Spotify is at the top of the channel list, one press up from KINK, where the TV always starts. OK on it opens a list of the account's playlists, with Liked Songs first. OK plays one, Back goes back to the stations. While Spotify plays, the list opens on it.
- OK pauses and plays, left and right skip to the next or previous song. Channel up and down and numbers still go to the stations.
- Playing a playlist or casting from the phone takes over from the radio, and the now-playing card, the history and the idle screen show the Spotify song, with a bar for how far it is. Every change, also on the phone (play, pause, next, previous), shows on the TV right away.
- Every new connection plays at full volume: the volume of the Spotify connection, which you see on the phone, not of the Pi or the TV. Turning it down on the phone still works, until the next connection.
- Picking Spotify with a number or channel up and down stops the radio and explains how to play something: OK opens the playlists then.
- When Spotify lets go (you disconnect the phone, or pick another device), the radio goes back to the first station (KINK).
- When the TV turns off or switches away, or you pick a radio station, the Pi ends the Spotify session, like a Bluetooth speaker that's switched off: a phone disconnects from Raspberry, and the song waits on the phone. The TV comes back on the first station.
- Casting while the TV is off or on another input turns the TV on and switches it to the Pi, like a Chromecast: the TV is the Pi's speaker. Only when music starts, and not within 10 seconds of the TV turning off, so a song starting just as you turn it off doesn't turn it right back on.
- The album cover shows beside the song, dimmed while paused, and the music widgets take its colour as their accent.

It runs on [go-librespot](https://github.com/devgianlu/go-librespot), a single Go binary that only needs ALSA, so the same release runs on Debian 11 and on newer Raspberry Pi OS versions. `pi/setup.sh` installs a pinned release after checking its SHA-512, with the settings in `pi/go-librespot.yml`. go-librespot plays through the kiosk's PulseAudio, and has its own API on `localhost:3678`, only reachable from the Pi itself:

- The app keeps a WebSocket open to it, and go-librespot pushes every change the moment it happens: nothing is polled. When the connection opens (or opens again, after go-librespot restarted) the app reads the status once to catch up. The connection stays open while the TV is off, so casting can turn the TV on. That's `SpotifyStore`.
- On a new connection the app sets the volume to 100, and to end the session it calls go-librespot's `/player/stop`. That also signs out whoever cast to it, after which go-librespot signs in again with its own account.
- The account is linked once, with Spotify's device pairing: the Spotify list in the channel list shows a code to enter at spotify.com/pair, as long as the Pi isn't linked. The credentials are kept in `~/.config/go-librespot/state.json` on the Pi. To link another account, delete that file and restart go-librespot.
- The playlists come from go-librespot's `/library/playlists` whenever the Spotify list opens, and play with `/player/play`. The progress bar runs on the position go-librespot sends with every song and seek, and ticks once a second while a song plays and the TV is on.
- To turn the TV on, the app posts to `/control/tv-on`: a CGI script that only the Pi itself may call. It writes `on 0` (turn on the TV) and `as` (make the Pi the active source) to `/run/raspberry/cec`, the pipe cec-client reads commands from, which the web server may write to.

### Sleep

When the TV turns off or switches to another input, nobody can see the Pi or hear it (its sound goes through the TV). `pi/hdmicec.sh` then sends F14, and the app goes to sleep: it shows the idle screen, drops the radio stream and pauses all polling (weather, song info, northern lights, Pi health). Chromium keeps running, so when the TV comes back the dashboard is there within a fraction of a second, the stream restarts and everything refreshes right away. The bridge also notes what the TV said last in `/run/raspberry/tv`, which the app reads when it starts: the TV often reports its state while the Pi boots, before Chromium is there to hear the key press. Measured on the Pi, the CPU goes from 8.5% to 2.6% busy and the sound card closes. Together with the Bluetooth chip switched off (see below), that saves a few tenths of a watt: modest, because an idle Pi 3 itself still draws around 2 W, about €5 of electricity a year.

The Pi can't sleep any deeper than that. A Raspberry Pi has no suspend to RAM or hibernation, so the only lower state is off, and from off it takes about 30 seconds to boot (28 measured with `systemd-analyze`) before Chromium even starts. Its USB bus can't be switched off either: the Pi boots from a USB stick.

The Pi's HDMI output stays on: on the Pi, CEC runs through the HDMI hardware, so switching it off could stop the Pi from ever hearing the TV turn on again.

All APIs are called directly from the browser, so any new data source must allow cross-origin requests (CORS). There is no proxy. The font ([Fira Code](https://github.com/tonsky/FiraCode)) and icons ([Lucide](https://lucide.dev/)) are bundled from npm, so nothing else is loaded from third parties.

### Remote control

| Button            | Channel list closed                                                | Channel list open                                                     |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Select (OK)       | Pause and play; on Spotify with nothing loaded, open its playlists | Play the highlighted channel or playlist, or open Spotify's playlists |
| Exit (Back)       | Go to the idle screen                                              | Back from Spotify's playlists, else close the list                    |
| Up / Down         | Open the channel list                                              | Move the highlight                                                    |
| Left / Right      | Previous or next song, on Spotify                                  | –                                                                     |
| Numbers           | Play that station number (not sent by the TCL 50C61K)              | Same                                                                  |
| Channel up / down | Next or previous station (not sent by the TCL either)              | Same                                                                  |
| Red               | Free                                                               | –                                                                     |
| Green             | Free                                                               | –                                                                     |
| Yellow            | Free                                                               | –                                                                     |
| Blue              | Free                                                               | –                                                                     |

Numbers work like a TV, on a keyboard or a TV that sends them over HDMI-CEC (the TCL 50C61K sends the arrows, OK, Back and the colour buttons, but not numbers): a digit that can't start a longer number plays right away (with 14 stations, 2 to 9), otherwise the app waits 1.5 seconds for a second digit (1, then 4 for Spotify). The typed number shows in the now-playing card.

On the idle screen any button brings the dashboard back, and the music keeps playing throughout. Numbers and channel up and down also act on that first press, because they say exactly what they want. OK doesn't: it's the button people press to wake the screen, and shouldn't pause the music while doing so.

### Look

VS Code on a Mac, connected to the Pi: every widget is an editor window with macOS's traffic lights and its path as the title (`~/weather`), in [Fira Code](https://github.com/tonsky/FiraCode) with its ligatures. The lights are grey, as for a window that isn't focused, except on the channel list. The date is a comment (`// Tuesday 29 September`). The colours are calm enough for the living room, with an accent that takes the colour of the photo.

The windows are frosted glass, so they take on the photo's colours and light instead of sitting on top of it as dark boxes. The weather windows have no headings of their own: the title bar already names them. The design tokens (colours, font, sizes, corners) are in `src/styles/base/tokens.scss`, the window with its title bar in `src/styles/components/widget.scss`.

`pi/hdmicec.sh` turns the remote's colour buttons into F16 to F19 (red, green, yellow, blue), because Chromium keeps F1 to F4 for itself. Buttons the TV sends that do nothing yet are logged: `journalctl -t raspberry-cec` on the Pi shows their names.

## Open for modification

This project can be downloaded and modified by anyone interested.

### Requirements

- Download and install [Node.js](https://nodejs.org/). Node 22 LTS or higher is required (Angular 22).

### Setup

- Clone this repo, go to its root directory and run `npm install` to install its dependencies.
- Create `src/environments/environment.ts` and `src/environments/environment.prod.ts` with your Pexels API key, location and, for the bins, postcode and house number. `environment_example.ts` shows what goes in them.

### Development

Run `npm run start` for a dev server. Navigate to `http://localhost:1337/`.

### Deploy

Run `npm run deploy`. It asks before each step, `npm run deploy -- --yes` does them all:

1. Build the app.
2. Update the Pi's software (`apt full-upgrade`): Raspberry Pi's packages, like Chromium and the kernel, only update here. Debian's security updates install themselves every night (`pi/apt-unattended.conf`).
3. Copy `pi/` to the Pi and run `pi/setup.sh`, which applies the kiosk setup (see below).
4. Mirror `dist/raspberry` into the Pi's web root with `rsync --delete`, so no old files linger.
5. Reload the page on the TV, or restart the kiosk when its session files changed.

## Unit testing

Run `npm run test` to execute the unit tests via [Vitest](https://vitest.dev/) in watch mode, or `npm run test:no-watch` for a single run.

Open `coverage/raspberry/index.html` for a detailed coverage report.<br>
Note that the coverage folder is only created after running a test for the first time, and is hidden by default.

## Linting

Run `npm run lint` to lint the project via [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

## The Pi

Everything the Pi needs lives in `pi/`, and `pi/setup.sh` applies it. The script is safe to run again: it only changes what differs, and `npm run deploy` runs it every time.

| File                                       | Installed as                                                                    | What it does                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bash_profile`                             | `~/.bash_profile`                                                               | On the automatic tty1 login: starts the remote control bridge once (cec-client, reading commands from `/run/raspberry/cec`), then X without a mouse cursor                                                                    |
| `xinitrc`                                  | `~/.xinitrc`                                                                    | Keeps the TV awake, gives the F13 and F14 signals and the F16 to F19 colour buttons a keycode Chromium understands, and runs Chromium in kiosk mode, restarting it if it ever quits or crashes                                |
| `hdmicec.sh`                               | `/usr/local/bin/raspberry-cec`                                                  | Turns TV remote buttons (HDMI-CEC) into key presses with `xdotool`, wakes the app when the TV turns on or switches to the Pi, and puts it to sleep when the TV turns off or switches away. Notes which in `/run/raspberry/tv` |
| `asoundrc`                                 | `~/.asoundrc`                                                                   | Sends all sound to HDMI                                                                                                                                                                                                       |
| `pi-health.sh`                             | `/usr/local/bin/raspberry-health`                                               | Writes `/run/raspberry/health.json`, run every minute by `cron` (`/etc/cron.d/raspberry-health`)                                                                                                                              |
| `lighttpd.conf`                            | `/etc/lighttpd/conf-enabled/50-raspberry.conf`                                  | Cache headers (built files forever, the page and live files never), `/live/` for the live files, and `/control/` for the Pi's own browser only                                                                                |
| `tmpfiles.conf`                            | `/etc/tmpfiles.d/raspberry.conf`                                                | Creates `/run/raspberry` in RAM for the live files, which change every minute and would otherwise wear out the SD card, and the pipe for cec-client's commands                                                                |
| `go-librespot.yml`, `go-librespot.service` | `~/.config/go-librespot/config.yml`, `/etc/systemd/system/go-librespot.service` | Spotify Connect as `pipi`, through the kiosk's PulseAudio                                                                                                                                                                     |
| `control-tv-on`                            | `/usr/local/lib/raspberry/control/tv-on`                                        | Lets the app turn the TV on when Spotify starts while it's off                                                                                                                                                                |
| `journald.conf`                            | `/etc/systemd/journald.conf.d/raspberry.conf`                                   | Caps the system log at 50 MB (it had grown to 1.7 GB)                                                                                                                                                                         |
| `apt-unattended.conf`                      | `/etc/apt/apt.conf.d/52raspberry-unattended-upgrades`                           | Installs Debian's security updates every night, and nothing else                                                                                                                                                              |

It also installs the packages the kiosk needs, sets up the automatic login on tty1, and turns off services the kiosk doesn't use: Bluetooth, ModemManager, triggerhappy, udisks2, the rsync daemon (rsync over SSH still works), and the display backlight and EEPROM services of other Pi models. It removes Raspberry Pi Connect (remote access through raspberrypi.com), which Raspberry Pi OS 13 comes with. After the first boot of a fresh install it switches cloud-init off, which only sets up the user and Wi-Fi on that first boot, and removes its files from the boot partition, as they hold the Wi-Fi key and the password hash. It switches the Bluetooth chip off with `dtoverlay=disable-bt` in the boot config (which takes a reboot), and sets the Wi-Fi country to the Netherlands, without which the Pi's Wi-Fi stays blocked.

### Hardware and software

- Raspberry Pi 3 Model B on Wi-Fi, HDMI to the TV, Bluetooth switched off
- Wi-Fi: the Pi 3 only has 2.4 GHz, so the network needs a 2.4 GHz band (a dual-band network with one name is fine). Wi-Fi power saving is off (`pi/udev-wifi.rules`): on the Pi 3 it makes connections hesitate, which broke Spotify's. Streaming over Wi-Fi costs no measurable extra CPU (7.9% busy against 8.5% on Ethernet, at a signal of -41 dBm). The network and its password live on the Pi only, never in this repo: in `/etc/wpa_supplicant/wpa_supplicant.conf` on Raspberry Pi OS 11, in `/etc/NetworkManager/system-connections/` from 12 on (Raspberry Pi Imager puts them there)
- Raspberry Pi OS Lite 13 (trixie), 64-bit, with Chromium 154 (the app needs 117 or newer). It still uses the GPU for compositing and rasterization, through ANGLE: 60 fps at rest, about 30 while the channel list slides in, and 8.7% CPU while awake, the same as on Raspberry Pi OS 11 with Chromium 126
- `/boot/config.txt` (`/boot/firmware/config.txt` from Raspberry Pi OS 12 on): `dtoverlay=vc4-kms-v3d` (the default), and from `setup.sh`: `disable_overscan=1`, `hdmi_ignore_cec_init=1` (don't switch the TV's input on boot), `dtparam=audio=off` (no headphone jack, so sound can only go to HDMI) and `dtoverlay=disable-bt`

### Why these tools

- **Web server: lighttpd.** It serves a handful of static files to one browser on the same machine, using about 1 MB of memory. nginx would do the same job without being faster, and Caddy or a Node server would only add memory. Serving the app from disk (`file://`) doesn't work, because browsers block JavaScript modules there.
- **Browser: Chromium.** It's the browser Raspberry Pi tunes for its GPU, and the only one on this OS that supports all the CSS the app uses (relative colours, subgrid, `@property`). WPE WebKit (`cog`) is lighter, but the version for bullseye is too old for that CSS. Firefox is heavier on a Pi 3.
- **Display: X11 with `startx`, no window manager.** It's the least that can show a full-screen browser, and `xdotool` (for the remote control) needs it.

### Reinstalling the operating system

The Pi was reinstalled with Raspberry Pi OS 13 in October 2026, when Debian 11 had left long-term support. Everything it needs is in this repo, apart from the Wi-Fi network and the password, so a reinstall goes:

1. Back up the USB stick on a Mac: put it in, find it with `diskutil list` (say `/dev/disk4`), then `diskutil unmountDisk /dev/disk4` and `sudo dd if=/dev/rdisk4 bs=4m status=progress | gzip -1 > ~/raspberry-backup.img.gz` in Terminal. macOS only lets an app read a whole disk with Full Disk Access (System Settings, Privacy & Security), and a stick of 32 GB takes about an hour. To go back, Raspberry Pi Imager writes that file back with "Use custom".
2. Flash Raspberry Pi OS Lite (64-bit) onto the stick with Raspberry Pi Imager. In its settings: hostname `raspberrypi`, user `pipi`, the Wi-Fi network with country NL, time zone Europe/Amsterdam, and SSH with your public key.
3. Put the stick back in the Pi and let it boot for a few minutes (the first boot grows the file system). On the Mac, forget the old SSH key with `ssh-keygen -R raspberrypi.local`.
4. Run `npm run deploy -- --yes`, then reboot the Pi. `setup.sh` installs and configures everything else, including the `config.txt` lines above.

### Links

- Kiosk: https://blog.r0b.io/post/minimal-rpi-kiosk/
- HDMI-CEC: https://ubuntu-mate.community/t/controlling-raspberry-pi-with-tv-remote-using-hdmi-cec/4250

### Display

The Pi 3 outputs at most 1080p (SDR, 8-bit), so the TV's 4K, HDR and wide colour gamut are out of reach; the TV upscales. It already runs at 1920×1080 at 60 Hz. The UI is sized in `rem` from the viewport, so it fills any resolution.

- On the TV, set the HDMI input to Game or PC mode (sharp text, no overscan, no motion smoothing) and pick a Movie/Filmmaker style picture mode, so the photos aren't oversaturated.
- If the Pi ever picks a wrong resolution, force 1080p60 by adding `video=HDMI-A-1:1920x1080@60` to `/boot/cmdline.txt`.
- Performance: there are no `backdrop-filter` blurs or looping animations, the frosted glass is a stretched 48px copy of the photo, and the screen only re-renders when a minute passes or the song changes.
- Animations: the Pi 3 renders a steady 60 fps at rest, but drops to about 30 fps while half the screen moves, whatever CSS property drives it. So motion is short (200 ms for the channel list, instant for the highlight), and nothing that moves has the photo glass: its fixed background is repainted on every frame of movement, which caused hitches of 130 ms. Measure changes on the TV itself, through the DevTools tunnel below.

### Looking at the TV from your computer

Chromium on the Pi listens for DevTools on `localhost:9222`, which is only reachable from the Pi itself. Tunnel it over SSH:

```
ssh -N -L 9222:localhost:9222 pipi@raspberrypi.local
```

Then open `chrome://inspect` in Chrome on your computer, add `localhost:9222` under "Configure", and inspect the TV's page: console, network, and a live view of the screen.

### Pi health

`/live/health.json` holds the Pi's temperature, load, memory, storage, uptime and power state (`vcgencmd get_throttled`). The app reads it from its own origin, so no CORS is involved. A warning shows under the now-playing card at 75 °C or more, on under-voltage or throttling, with 90% or more memory or storage in use, or when no measurement came in for 5 minutes.
