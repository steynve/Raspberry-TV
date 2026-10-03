#!/bin/bash
# Builds the app and deploys it, with the kiosk setup in pi/, to the Raspberry Pi.
# ./deploy.sh asks before every step, ./deploy.sh --yes does them all (without rebooting).
set -euo pipefail

PI="pipi@raspberrypi.local"
SSH_OPTIONS=(-o LogLevel=ERROR)

ask() {
    if [ "${1:-}" = "--yes" ]; then return 0; fi
    read -p "$2 (y/n) " -n 1 -r answer
    echo
    [[ $answer =~ ^[Yy]$ ]]
}

pi() {
    ssh "${SSH_OPTIONS[@]}" "$PI" "$@"
}

mode="${1:-}"

if ask "$mode" "Build a new version?"; then
    npm run build
fi

# Debian's security updates install themselves every night (see pi/apt-unattended.conf), the rest,
# like Chromium and the kernel, only here
if ask "$mode" "Update the Pi's software?"; then
    pi "sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get full-upgrade -y -q \
        -o Dpkg::Options::=--force-confold"
    if pi "test -f /run/reboot-required"; then
        echo "The update takes effect after a reboot"
    fi
fi

# The setup first: on a fresh Pi it installs the web server (and rsync) the app goes into
if ask "$mode" "Update the kiosk setup (pi/)?"; then
    rsync -az --delete -e "ssh ${SSH_OPTIONS[*]}" pi/ "$PI:pi/"
    pi "sudo ~/pi/setup.sh"
fi

if ask "$mode" "Deploy the app?"; then
    # Mirror the build into the web root, so no old files linger
    rsync -az --delete --no-owner --no-group \
        -e "ssh ${SSH_OPTIONS[*]}" --rsync-path="sudo rsync" \
        dist/raspberry/ "$PI:/var/www/html/"
fi

if [ "$mode" != "--yes" ] && ask "" "Reboot the Pi?"; then
    pi "sudo reboot" || true
    exit 0
fi

# A changed session needs a new X server, otherwise reloading the page is enough
if pi "test -f /run/raspberry-kiosk-restart"; then
    echo "Restarting the kiosk"
    pi "sudo rm /run/raspberry-kiosk-restart && sudo pkill -x Xorg" || true
else
    echo "Reloading the page"
    pi "DISPLAY=:0 XAUTHORITY=\$HOME/.Xauthority xdotool key F5" || true
fi
