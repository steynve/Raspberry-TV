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

# Bluetooth isn't used: switching the chip off at boot saves a little power. Appended under [all],
# so it never lands in a section for another Pi model. Wi-Fi stays on, it's the Pi's network.
CONFIG=/boot/firmware/config.txt
[ -f "$CONFIG" ] || CONFIG=/boot/config.txt
if grep -qx "dtoverlay=disable-wifi" "$CONFIG"; then
    sed -i '/^dtoverlay=disable-wifi$/d' "$CONFIG"
    echo "Removed dtoverlay=disable-wifi from $CONFIG, takes effect after a reboot"
fi
if ! grep -qx "dtoverlay=disable-bt" "$CONFIG"; then
    printf '\n[all]\ndtoverlay=disable-bt\n' >> "$CONFIG"
    echo "Added dtoverlay=disable-bt to $CONFIG, takes effect after a reboot"
fi

# No Wi-Fi power saving: on the Pi 3 it makes streams stutter and drop, see udev-wifi.rules
install_file udev-wifi.rules /etc/udev/rules.d/70-raspberry-wifi.rules 644 || true
if /usr/sbin/iw dev wlan0 get power_save 2> /dev/null | grep -q on; then
    /usr/sbin/iw dev wlan0 set power_save off
    echo "Switched Wi-Fi power saving off"
fi

# Wi-Fi only works with a country set, for the channels and power allowed there
WIFI_COUNTRY=NL
if [ "$(raspi-config nonint get_wifi_country 2> /dev/null)" != "$WIFI_COUNTRY" ]; then
    raspi-config nonint do_wifi_country "$WIFI_COUNTRY"
fi

# Live files in RAM (health.json, spotify.json), served as /live/
if install_file tmpfiles.conf /etc/tmpfiles.d/raspberry.conf 644; then
    systemd-tmpfiles --create /etc/tmpfiles.d/raspberry.conf
fi

# Spotify Connect: spotifyd, pinned to a release and checked against its SHA-512 before it's used.
# Its prebuilt aarch64 binary is linked against Debian 11's glibc and OpenSSL, so it runs here as is.
SPOTIFYD_VERSION=0.4.2
SPOTIFYD_SHA512=23d7f48a05895b25722c467178d17c6c3f1e67efe0e2eea42a5362d61f0b46927635cc30d61ef64f7e1147523fafbaeda8bda9afe36cebccb704bdaf3d9a61e9
spotify_changed=
if [ "$(/usr/local/bin/spotifyd --version 2> /dev/null)" != "spotifyd $SPOTIFYD_VERSION" ]; then
    download=$(mktemp -d)
    curl -fsSL -o "$download/spotifyd.tar.gz" \
        "https://github.com/Spotifyd/spotifyd/releases/download/v$SPOTIFYD_VERSION/spotifyd-linux-aarch64-default.tar.gz"
    echo "$SPOTIFYD_SHA512  $download/spotifyd.tar.gz" | sha512sum --check --quiet
    tar -xzf "$download/spotifyd.tar.gz" -C "$download"
    install -m 755 "$download/spotifyd" /usr/local/bin/spotifyd
    rm -rf "$download"
    echo "Installed spotifyd $SPOTIFYD_VERSION"
    spotify_changed=1
fi
# spotifyd runs the hook fresh on every event, so a new hook needs no restart (which would cut off
# whoever is listening)
install_file spotify-event.py /usr/local/bin/raspberry-spotify 755 || true
install_file spotify-pause.sh /usr/local/bin/raspberry-spotify-pause 755 || true
install_file control-spotify-pause /usr/local/lib/raspberry/control/spotify-pause 755 || true
if install_file spotifyd.service /etc/systemd/system/spotifyd.service 644; then
    systemctl daemon-reload
    spotify_changed=1
fi
# A broken sudoers file locks sudo, so it's checked before it's installed
if ! cmp -s sudoers /etc/sudoers.d/raspberry; then
    visudo -cqf sudoers
    install -m 440 -o root -g root sudoers /etc/sudoers.d/raspberry
    echo "Updated /etc/sudoers.d/raspberry"
fi
systemctl enable --quiet spotifyd
if [ -n "$spotify_changed" ]; then
    systemctl restart spotifyd
fi

# The Pi's health, every minute
install_file pi-health.sh /usr/local/bin/raspberry-health 755 || true
install_file cron /etc/cron.d/raspberry-health 644 || true

# Small logs
if install_file journald.conf /etc/systemd/journald.conf.d/raspberry.conf 644; then
    systemctl restart systemd-journald
    journalctl --vacuum-size=50M
fi

# Web server. A config that doesn't pass lighttpd's own test is rolled back, so it can never stop
# the web server from starting after a reboot.
LIGHTTPD_CONF=/etc/lighttpd/conf-enabled/50-raspberry.conf
if ! cmp -s lighttpd.conf "$LIGHTTPD_CONF"; then
    [ -f "$LIGHTTPD_CONF" ] && cp "$LIGHTTPD_CONF" "$LIGHTTPD_CONF.previous"
    install_file lighttpd.conf "$LIGHTTPD_CONF" 644 || true
    if ! lighttpd -tt -f /etc/lighttpd/lighttpd.conf; then
        echo "lighttpd rejected the new config, restoring the previous one"
        if [ -f "$LIGHTTPD_CONF.previous" ]; then mv "$LIGHTTPD_CONF.previous" "$LIGHTTPD_CONF"; else rm -f "$LIGHTTPD_CONF"; fi
        exit 1
    fi
    rm -f "$LIGHTTPD_CONF.previous"
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
