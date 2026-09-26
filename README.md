# Raspberry

An open-source application for personal use: a TV dashboard for a Raspberry Pi kiosk, showing a seasonal wallpaper, internet radio, weather, pollen and a clock.

## Open for modification

This project can be downloaded and modified by anyone interested.

### Requirements

- Download and install [Node.js](https://nodejs.org/). Node 22 LTS or higher is required (Angular 22).

### Setup

- Clone this repo, go to its root directory and run `npm install` to install its dependencies.
- Create an `environment.ts` file in the project's `root/src/environment` directory. An example can be found in `environment_example.ts`.

### Development

Run `npm run start` for a dev server. Navigate to `http://localhost:1337/`.

### Deploy

Run `npm run deploy` for a full build of the project.
This executes a custom bash script providing multiple options, but is mainly focussed on automating the SSH actions I had to manually do after every build

## Unit testing

Run `npm run test` to execute the unit tests via [Vitest](https://vitest.dev/) in watch mode, or `npm run test:no-watch` for a single run.

Visit `root/coverage/raspberry/index.html` for a detailed coverage report.<br>
Note that the coverage folder is only created after running a test for the first time, and is hidden by default.

## Linting

Run `npm run lint` to lint the project via [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

## TV notes

### Requirements

- Rasperry Pi OS Lite (64 bit)
- lighttpd

### Kiosk

- https://blog.r0b.io/post/minimal-rpi-kiosk/

### HDMI-CEC

- https://ubuntu-mate.community/t/controlling-raspberry-pi-with-tv-remote-using-hdmi-cec/4250

### Sound over HDMI

- Uncomment `hdmi_drive=2` in `/boot/config.txt`
- sudo apt-get install `alsa-utils pulseaudio`
- sudo `raspi-config` -> System Options -> Audio -> HDMI/Hifi
