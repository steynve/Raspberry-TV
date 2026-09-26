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

if ask "$mode" "Deploy the app?"; then
    # Mirror the build into the web root: old files go, the Pi's own health.json stays
    rsync -az --delete --exclude health.json --no-owner --no-group \
        -e "ssh ${SSH_OPTIONS[*]}" --rsync-path="sudo rsync" \
        dist/raspberry/ "$PI:/var/www/html/"
fi

if ask "$mode" "Update the kiosk setup (pi/)?"; then
    rsync -az --delete -e "ssh ${SSH_OPTIONS[*]}" pi/ "$PI:pi/"
    pi "sudo ~/pi/setup.sh"
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
