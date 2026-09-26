#!/bin/bash
# Configures a Raspberry Pi as the TV kiosk. Safe to run again: it only changes what differs.
# npm run deploy runs it for you, or on the Pi: sudo ~/pi/setup.sh
set -euo pipefail

cd "$(dirname "$0")"
USER_NAME=pipi
HOME_DIR=/home/$USER_NAME
RESTART_MARKER=/run/raspberry-kiosk-restart

# install_file <source> <destination> <mode> [owner], returns 0 when the file changed
install_file() {
    if cmp -s "$1" "$2"; then
        return 1
    fi

    install -D -m "$3" -o "${4:-root}" -g "${4:-root}" "$1" "$2"
    echo "Updated $2"
}

# Everything the kiosk needs, on a fresh Raspberry Pi OS Lite too
packages=(xserver-xorg xinit x11-xserver-utils cec-utils xdotool lighttpd rsync alsa-utils pulseaudio)
if apt-cache show chromium-browser > /dev/null 2>&1; then packages+=(chromium-browser); else packages+=(chromium); fi
missing=$(dpkg-query -W -f='${Package} ${Status}\n' "${packages[@]}" 2>&1 | grep -v "install ok installed" | cut -d' ' -f1 || true)
if [ -n "$missing" ]; then
    apt-get install -y --no-install-recommends $missing
fi

# The kiosk session, restarted by deploy.sh when it changes
for file in bash_profile xinitrc asoundrc; do
    if install_file "$file" "$HOME_DIR/.$file" 644 "$USER_NAME"; then
        touch "$RESTART_MARKER"
    fi
done

# The remote bridge: when it changes, stop the old one so the kiosk restart starts the new one
if install_file hdmicec.sh /usr/local/bin/raspberry-cec 755; then
    pkill -x cec-client || true
    touch "$RESTART_MARKER"
fi

# Log in automatically on tty1, which starts the kiosk
if [ ! -f /etc/systemd/system/getty@tty1.service.d/autologin.conf ]; then
    raspi-config nonint do_boot_behaviour B2
fi

# The wired kiosk doesn't use the Wi-Fi and Bluetooth chips: switching them off at boot saves a
# little power. Appended under [all], so they never land in a section for another Pi model.
CONFIG=/boot/firmware/config.txt
[ -f "$CONFIG" ] || CONFIG=/boot/config.txt
missing_overlays=()
for overlay in disable-wifi disable-bt; do
    grep -qx "dtoverlay=$overlay" "$CONFIG" || missing_overlays+=("dtoverlay=$overlay")
done
if [ ${#missing_overlays[@]} -gt 0 ]; then
    {
        printf '\n[all]\n'
        printf '%s\n' "${missing_overlays[@]}"
    } >> "$CONFIG"
    echo "Added ${missing_overlays[*]} to $CONFIG, takes effect after a reboot"
fi

# The Pi's health, every minute
install_file pi-health.sh /usr/local/bin/raspberry-health 755 || true
install_file cron /etc/cron.d/raspberry-health 644 || true

# Small logs
if install_file journald.conf /etc/systemd/journald.conf.d/raspberry.conf 644; then
    systemctl restart systemd-journald
    journalctl --vacuum-size=50M
fi

# Web server
if install_file lighttpd.conf /etc/lighttpd/conf-enabled/50-raspberry.conf 644; then
    lighttpd -tt -f /etc/lighttpd/lighttpd.conf
    systemctl reload lighttpd
fi

# Services a wired kiosk doesn't need: Bluetooth, modems, hotkeys, USB drive mounting,
# the rsync daemon (rsync over SSH still works), and displays and EEPROMs a Pi 3 doesn't have
for service in bluetooth hciuart ModemManager triggerhappy.socket triggerhappy udisks2 rsync \
    rpi-display-backlight rpi-eeprom-update; do
    if systemctl is-enabled --quiet "$service" 2> /dev/null; then
        systemctl disable --now "$service"
    fi
done
