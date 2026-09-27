# Raspberry

An open-source application for personal use: a TV dashboard for a Raspberry Pi kiosk, with a nature photo that follows the season and the weather, internet radio, a clock, the sky, the weather and the Pi's own health.

## What it does

A Raspberry Pi boots into Chromium in kiosk mode and loads this app from its own lighttpd server. The Pi is connected to the living room TV over HDMI, and the TV remote controls the app through HDMI-CEC (`pi/hdmicec.sh` translates remote buttons into key presses, and tells the app when the TV turns on or switches to the Pi).

The screen is a full-screen photo with the clock top-left, what's playing top-right and the weather along the bottom. The middle stays free for the photo, unless rain is coming:

| Part         | What it shows                                                                                                                                                                     | Source                                                                                           | Refreshes                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- |
| Wallpaper    | A nature photo matching the season and the weather (mist, rain, snow, storm, sun, a starry sky on clear nights), a different one each day. Its average colour tints the UI accent | [Pexels](https://www.pexels.com/api/) (API key)                                                  | Photos weekly, day 6-hourly |
| Clock        | Date and time, in English with a 24-hour clock                                                                                                                                    | Local                                                                                            | Every minute                |
| Sky          | By day the daylight left and the golden hour, at night the moon phase, how clear the night is and the next sunrise. Northern lights when tonight's Kp is 6 or higher              | Open-Meteo, [NOAA](https://www.swpc.noaa.gov/) Kp forecast, the moon phase is calculated locally | Every minute                |
| Radio        | Plays an internet radio station over the TV speakers, or Spotify cast from a phone, with the current song and artist, and the last 5 songs in the channel list                    | KINK, FLUX FM and DNB Radio "now playing" APIs, Spotify Connect on the Pi                        | Every 30 seconds            |
| Now          | Temperature, conditions, wind and gusts, trail conditions, whether it stays dry, UV from 5, and tree/grass/weed pollen on a 0–10 scale                                            | [Open-Meteo](https://open-meteo.com/) forecast and air quality                                   | Every 5 minutes             |
| Next 2 hours | Only when rain is coming: when it starts or stops, with a precipitation profile in 15 minute steps                                                                                | Open-Meteo                                                                                       | Every 5 minutes             |
| This week    | Five days with conditions, chance of rain and temperature range                                                                                                                   | Open-Meteo                                                                                       | Every 5 minutes             |
| Raspberry Pi | Temperature, load, memory, storage, power and uptime in the channel list, and a warning top-right when something is wrong                                                         | `health.json`, written by `pi/pi-health.sh`                                                      | Every minute                |

The trail conditions are an estimate: a water balance over the last 48 hours, where rain adds water and evaporation (ET₀) removes it. 1 mm or more left means "wet", 4 mm or more "muddy". Tune the thresholds in `src/app/data/utils/outdoors.ts` to your local trails.

After sunset the photo dims and the text softens, so the TV doesn't light up the room at night.

### Idle

After 10 minutes without a remote button press, or straight away with the Back button, the dashboard fades out and the photo fades almost to black. What stays is a dim corner with the time, the song that's playing and the weather: calm enough to leave on all day. Any button, the TV turning on, or the TV switching its input back to the Pi brings the dashboard back. The first button press only wakes it, so it never opens the channel list or goes back to idle by accident.

The TV events come from HDMI-CEC: `pi/hdmicec.sh` sends the app an F13 key press (no remote button sends it) when libcec reports that the Pi became the active source, or that the TV's power status changed to on. The timeout is `IDLE_AFTER` in `src/app/features/tv/tv.component.ts`.

### Spotify

The Pi is a Spotify Connect device called **Raspberry**, like the TV or a speaker: in the Spotify app, pick Raspberry as the device and it plays on the TV. It needs Spotify Premium. Everything is controlled from the phone. On the TV, Spotify is the last entry in the channel list:

- Casting from the phone takes over from the radio, and the now-playing card, the history and the idle screen show the Spotify song.
- Picking a radio station while Spotify plays pauses Spotify, so the two never play at the same time.
- Picking Spotify in the list without anything playing stops the radio and explains how to cast.
- When the TV turns off or switches away, Spotify pauses too.

It runs on [spotifyd](https://github.com/Spotifyd/spotifyd), whose prebuilt binary works on Debian 11 as is ([raspotify](https://github.com/dtcooper/raspotify) needs Debian 12 or newer). `pi/setup.sh` installs a pinned release after checking its SHA-512. On every player event spotifyd runs `pi/spotify-event.py`, which reads the song from spotifyd's MPRIS interface, writes `/run/raspberry/spotify.json`, and taps the app with F15. At a track change spotifyd fires up to four events within a few seconds, so the hooks take turns, and whether music plays comes from the event rather than MPRIS, which briefly reports "Stopped" in between. spotifyd is found on D-Bus by its unique name, because it loses its MPRIS name when it reconnects to Spotify. Cron also runs the hook every minute, and the app checks the file every 15 seconds, so a missed update corrects itself. To pause Spotify, the app posts to `/control/spotify-pause`: a CGI script that only the Pi itself may call, allowed by one sudo rule to run the pause as `pipi`.

### Sleep

When the TV turns off or switches to another input, nobody can see the Pi or hear it (its sound goes through the TV). `pi/hdmicec.sh` then sends F14, and the app goes to sleep: it shows the idle screen, drops the radio stream and pauses all polling (weather, song info, northern lights, Pi health). Chromium keeps running, so when the TV comes back the dashboard is there within a fraction of a second, the stream restarts and everything refreshes right away. Measured on the Pi, the CPU goes from 8.5% to 2.6% busy and the sound card closes. Together with the Bluetooth chip switched off (see below), that saves a few tenths of a watt: modest, because an idle Pi 3 itself still draws around 2 W.

The Pi's HDMI output stays on: on the Pi, CEC runs through the HDMI hardware, so switching it off could stop the Pi from ever hearing the TV turn on again.

All APIs are called directly from the browser, so any new data source must allow cross-origin requests (CORS). There is no proxy. Fonts ([Geist](https://vercel.com/font)) and icons ([Lucide](https://lucide.dev/)) are bundled from npm, so nothing else is loaded from third parties.

### Remote control

| Button         | Channel list closed   | Channel list open                        |
| -------------- | --------------------- | ---------------------------------------- |
| Select (Enter) | Open the channel list | Play the highlighted channel, close list |
| Exit (Back)    | Go to the idle screen | Close the list, reset the highlight      |
| Up / Down      | –                     | Move the highlight                       |

On the idle screen any button brings the dashboard back, and the music keeps playing throughout.

## Open for modification

This project can be downloaded and modified by anyone interested.

### Requirements

- Download and install [Node.js](https://nodejs.org/). Node 22 LTS or higher is required (Angular 22).

### Setup

- Clone this repo, go to its root directory and run `npm install` to install its dependencies.
- Create `src/environments/environment.ts` and `src/environments/environment.prod.ts` with your Pexels API key and location. `environment_example.ts` shows what goes in them.

### Development

Run `npm run start` for a dev server. Navigate to `http://localhost:1337/`.

### Deploy

Run `npm run deploy`. It asks before each step, `npm run deploy -- --yes` does them all:

1. Build the app.
2. Mirror `dist/raspberry` into the Pi's web root with `rsync --delete`, so no old files linger.
3. Copy `pi/` to the Pi and run `pi/setup.sh`, which applies the kiosk setup (see below).
4. Reload the page on the TV, or restart the kiosk when its session files changed.

## Unit testing

Run `npm run test` to execute the unit tests via [Vitest](https://vitest.dev/) in watch mode, or `npm run test:no-watch` for a single run.

Open `coverage/raspberry/index.html` for a detailed coverage report.<br>
Note that the coverage folder is only created after running a test for the first time, and is hidden by default.

## Linting

Run `npm run lint` to lint the project via [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

## The Pi

Everything the Pi needs lives in `pi/`, and `pi/setup.sh` applies it. The script is safe to run again: it only changes what differs, and `npm run deploy` runs it every time.

| File                                                   | Installed as                                                                                                           | What it does                                                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bash_profile`                                         | `~/.bash_profile`                                                                                                      | On the automatic tty1 login: starts the remote control bridge once, then X without a mouse cursor                                                                                         |
| `xinitrc`                                              | `~/.xinitrc`                                                                                                           | Keeps the TV awake, gives the F13 and F14 signals a keycode Chromium understands, and runs Chromium in kiosk mode, restarting it if it ever quits or crashes                              |
| `hdmicec.sh`                                           | `/usr/local/bin/raspberry-cec`                                                                                         | Turns TV remote buttons (HDMI-CEC) into key presses with `xdotool`, wakes the app when the TV turns on or switches to the Pi, and puts it to sleep when the TV turns off or switches away |
| `asoundrc`                                             | `~/.asoundrc`                                                                                                          | Sends all sound to HDMI                                                                                                                                                                   |
| `pi-health.sh`                                         | `/usr/local/bin/raspberry-health`                                                                                      | Writes `/run/raspberry/health.json`, run every minute by `cron` (`/etc/cron.d/raspberry-health`)                                                                                          |
| `lighttpd.conf`                                        | `/etc/lighttpd/conf-enabled/50-raspberry.conf`                                                                         | Cache headers (built files forever, the page and live files never), `/live/` for the live files, and `/control/` for the Pi's own browser only                                            |
| `tmpfiles.conf`                                        | `/etc/tmpfiles.d/raspberry.conf`                                                                                       | Creates `/run/raspberry` in RAM for the live files, which change every minute and would otherwise wear out the SD card                                                                    |
| `spotifyd.service`                                     | `/etc/systemd/system/spotifyd.service`                                                                                 | Spotify Connect as `pipi`, through the kiosk's PulseAudio                                                                                                                                 |
| `spotify-event.py`                                     | `/usr/local/bin/raspberry-spotify`                                                                                     | Writes `/run/raspberry/spotify.json` on every Spotify event and taps the app with F15                                                                                                     |
| `spotify-pause.sh`, `control-spotify-pause`, `sudoers` | `/usr/local/bin/raspberry-spotify-pause`, `/usr/local/lib/raspberry/control/spotify-pause`, `/etc/sudoers.d/raspberry` | Lets the app pause Spotify, and nothing else                                                                                                                                              |
| `journald.conf`                                        | `/etc/systemd/journald.conf.d/raspberry.conf`                                                                          | Caps the system log at 50 MB (it had grown to 1.7 GB)                                                                                                                                     |

It also installs the packages the kiosk needs, sets up the automatic login on tty1, and turns off services the kiosk doesn't use: Bluetooth, ModemManager, triggerhappy, udisks2, the rsync daemon (rsync over SSH still works), and the display backlight and EEPROM services of other Pi models. It switches the Bluetooth chip off with `dtoverlay=disable-bt` in the boot config (which takes a reboot), and sets the Wi-Fi country to the Netherlands, without which the Pi's Wi-Fi stays blocked.

### Hardware and software

- Raspberry Pi 3 Model B on Wi-Fi, HDMI to the TV, Bluetooth switched off
- Wi-Fi: the Pi 3 only has 2.4 GHz, so the network needs a 2.4 GHz band (a dual-band network with one name is fine). Wi-Fi power saving is off (`pi/udev-wifi.rules`): on the Pi 3 it makes connections hesitate, which broke Spotify's. Streaming over Wi-Fi costs no measurable extra CPU (7.9% busy against 8.5% on Ethernet, at a signal of -41 dBm). The network and its password live on the Pi only, in `/etc/wpa_supplicant/wpa_supplicant.conf` with the password hashed, never in this repo
- Raspberry Pi OS Lite 11 (bullseye), 64-bit, with Chromium 126 (the app needs 117 or newer)
- `/boot/config.txt`: `dtoverlay=vc4-kms-v3d`, `disable_overscan=1`, `hdmi_drive=2` (sound over HDMI) and `hdmi_ignore_cec_init=1` (don't switch the TV's input on boot)

### Why these tools

- **Web server: lighttpd.** It serves a handful of static files to one browser on the same machine, using about 1 MB of memory. nginx would do the same job without being faster, and Caddy or a Node server would only add memory. Serving the app from disk (`file://`) doesn't work, because browsers block JavaScript modules there.
- **Browser: Chromium.** It's the browser Raspberry Pi tunes for its GPU, and the only one on this OS that supports all the CSS the app uses (relative colours, subgrid, `@property`). WPE WebKit (`cog`) is lighter, but the version for bullseye is too old for that CSS. Firefox is heavier on a Pi 3.
- **Display: X11 with `startx`, no window manager.** It's the least that can show a full-screen browser, and `xdotool` (for the remote control) needs it.

### Operating system: time for a fresh install

Debian 11 left long-term support in August 2026. Its security archive is being taken down, so `/etc/apt/sources.list` has the security line commented out, as it only gave errors (a backup is in `sources.list.bak-2026-09-26`). The Pi still gets the updates Raspberry Pi publishes for bullseye, but no more Debian security fixes. Upgrading in place to a newer release isn't supported by Raspberry Pi, so when convenient:

1. Flash the current Raspberry Pi OS Lite (64-bit) with Raspberry Pi Imager: set the hostname to `raspberrypi`, the user to `pipi`, the Wi-Fi network, and add your SSH key.
2. Add the `/boot/config.txt` lines above (on newer releases the file is `/boot/firmware/config.txt`).
3. Run `npm run deploy -- --yes` and reboot. `setup.sh` installs everything else.

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
