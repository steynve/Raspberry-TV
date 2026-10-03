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
packages=(xserver-xorg xinit x11-xserver-utils cec-utils xdotool lighttpd rsync alsa-utils pulseaudio
    unattended-upgrades)
# Raspberry Pi's Chromium is chromium-browser on Raspberry Pi OS 11 and chromium from 12 on. Not
# by which one exists: newer repositories still list an old chromium-browser build.
. /etc/os-release
if [ "$VERSION_ID" = 11 ]; then packages+=(chromium-browser); else packages+=(chromium); fi
missing=()
for package in "${packages[@]}"; do
    dpkg-query -W -f='${Status}' "$package" 2> /dev/null | grep -q "install ok installed" || missing+=("$package")
done
if [ ${#missing[@]} -gt 0 ]; then
    apt-get update
    apt-get install -y --no-install-recommends "${missing[@]}"
fi

# Debian's security updates install themselves, see apt-unattended.conf
install_file apt-unattended.conf /etc/apt/apt.conf.d/52raspberry-unattended-upgrades 644 || true

# Raspberry Pi Connect (remote access through raspberrypi.com) comes with Raspberry Pi OS 13: the
# kiosk doesn't use it
if [[ $(dpkg-query -W -f='${Status}' rpi-connect-lite 2> /dev/null) == "install ok installed" ]]; then
    apt-get purge -y -qq rpi-connect-lite
    apt-get autoremove -y -qq
    echo "Removed Raspberry Pi Connect"
fi

# Raspberry Pi OS 13 sets itself up on its first boot with cloud-init, from user-data and
# network-config on the boot partition (see the README). After that cloud-init has nothing left to
# do but take 6 seconds of every boot, and those files hold the Wi-Fi key and the password hash,
# readable by anyone with the stick. The Wi-Fi itself stays: netplan keeps its own copy.
if [ -d /etc/cloud ] && [ ! -f /etc/cloud/cloud-init.disabled ] &&
    [[ $(cloud-init status 2> /dev/null) == *"status: done"* ]]; then
    touch /etc/cloud/cloud-init.disabled
    rm -f /boot/firmware/user-data /boot/firmware/network-config
    echo "Switched cloud-init off, the first boot is done"
fi

# The kiosk session, restarted by deploy.sh when it changes
for file in xinitrc asoundrc; do
    if install_file "$file" "$HOME_DIR/.$file" 644 "$USER_NAME"; then
        touch "$RESTART_MARKER"
    fi
done

# The remote bridge, started by bash_profile: when either changes, stop the old one so the kiosk
# restart starts the new one
cec_changed=
install_file bash_profile "$HOME_DIR/.bash_profile" 644 "$USER_NAME" && cec_changed=1
install_file hdmicec.sh /usr/local/bin/raspberry-cec 755 && cec_changed=1
if [ -n "$cec_changed" ]; then
    pkill -x cec-client || true
    touch "$RESTART_MARKER"
fi

# Log in automatically on tty1, which starts the kiosk
if [ ! -f /etc/systemd/system/getty@tty1.service.d/autologin.conf ]; then
    raspi-config nonint do_boot_behaviour B2
fi

# The boot config. Each takes effect after a reboot. Appended under [all], so it never lands in a
# section for another Pi model.
CONFIG=/boot/firmware/config.txt
[ -f "$CONFIG" ] || CONFIG=/boot/config.txt
config_lines=(
    disable_overscan=1     # the TV shows the whole picture
    hdmi_ignore_cec_init=1 # don't switch the TV to the Pi when the Pi boots
    dtoverlay=disable-bt   # Bluetooth isn't used: switching the chip off saves a little power
)
for line in "${config_lines[@]}"; do
    if ! grep -qx "$line" "$CONFIG"; then
        printf '\n[all]\n%s\n' "$line" >> "$CONFIG"
        echo "Added $line to $CONFIG, takes effect after a reboot"
    fi
done
# Sound only over HDMI: without the headphone jack, PulseAudio can't pick it by mistake
if grep -qx "dtparam=audio=on" "$CONFIG"; then
    sed -i 's/^dtparam=audio=on$/dtparam=audio=off/' "$CONFIG"
    echo "Switched the headphone jack off in $CONFIG, takes effect after a reboot"
fi
# Wi-Fi stays on, it's the Pi's network
if grep -qx "dtoverlay=disable-wifi" "$CONFIG"; then
    sed -i '/^dtoverlay=disable-wifi$/d' "$CONFIG"
    echo "Removed dtoverlay=disable-wifi from $CONFIG, takes effect after a reboot"
fi

# No Wi-Fi power saving: on the Pi 3 it makes streams stutter and drop, see udev-wifi.rules. From
# Raspberry Pi OS 12 on, NetworkManager runs the Wi-Fi, and would switch it back on when it connects.
install_file udev-wifi.rules /etc/udev/rules.d/70-raspberry-wifi.rules 644 || true
if [ -d /etc/NetworkManager/conf.d ]; then
    install_file networkmanager-wifi.conf /etc/NetworkManager/conf.d/raspberry-wifi.conf 644 || true
fi
if /usr/sbin/iw dev wlan0 get power_save 2> /dev/null | grep -q on; then
    /usr/sbin/iw dev wlan0 set power_save off
    echo "Switched Wi-Fi power saving off"
fi

# Wi-Fi only works with a country set, for the channels and power allowed there
WIFI_COUNTRY=NL
if [ "$(raspi-config nonint get_wifi_country 2> /dev/null)" != "$WIFI_COUNTRY" ]; then
    raspi-config nonint do_wifi_country "$WIFI_COUNTRY"
fi

# mDNS (raspberrypi.local, and Spotify Connect's "Raspberry") over IPv4 only. Over IPv6, the Wi-Fi
# echoes the Pi's own announcement back, and avahi takes it for another device with the same name:
# it renamed the Pi to raspberrypi-2.local at every boot. go-librespot registers with avahi, so it
# registers again after the restart.
AVAHI_CONF=/etc/avahi/avahi-daemon.conf
if grep -q "^#\?use-ipv6=yes" "$AVAHI_CONF"; then
    sed -i 's/^#\?use-ipv6=yes/use-ipv6=no/' "$AVAHI_CONF"
    systemctl restart avahi-daemon
    systemctl try-restart go-librespot 2> /dev/null || true # not installed yet on a fresh Pi
    echo "Switched mDNS over IPv6 off"
fi

# Live files in RAM (health.json), served as /live/
if install_file tmpfiles.conf /etc/tmpfiles.d/raspberry.conf 644; then
    systemd-tmpfiles --create /etc/tmpfiles.d/raspberry.conf
fi

# Spotify Connect: go-librespot, pinned to a release and checked against its SHA-512 before it's
# used. A static Go binary that only needs ALSA, so it runs on any Raspberry Pi OS.
GO_LIBRESPOT_VERSION=0.10.3
GO_LIBRESPOT_SHA512=54fd1dd435db6040dbd1a98a6ec256109a2a2a5c06023c9116ce954901b7d9eefa771e5c8a6013418ce5aca91bfc8b5524231013e412e03f5a055142fb7290d0
GO_LIBRESPOT_INSTALLED=/usr/local/lib/raspberry/go-librespot.sha512
spotify_changed=
if [ "$(cat "$GO_LIBRESPOT_INSTALLED" 2> /dev/null)" != "$GO_LIBRESPOT_SHA512" ]; then
    download=$(mktemp -d)
    curl -fsSL -o "$download/go-librespot.tar.gz" \
        "https://github.com/devgianlu/go-librespot/releases/download/v$GO_LIBRESPOT_VERSION/go-librespot_linux_arm64.tar.gz"
    echo "$GO_LIBRESPOT_SHA512  $download/go-librespot.tar.gz" | sha512sum --check --quiet
    tar -xzf "$download/go-librespot.tar.gz" -C "$download"
    install -m 755 "$download/go-librespot" /usr/local/bin/go-librespot
    mkdir -p "$(dirname "$GO_LIBRESPOT_INSTALLED")"
    echo "$GO_LIBRESPOT_SHA512" > "$GO_LIBRESPOT_INSTALLED"
    rm -rf "$download"
    echo "Installed go-librespot $GO_LIBRESPOT_VERSION"
    spotify_changed=1
fi
# Its own directory, where it also keeps its state
install -d -o "$USER_NAME" -g "$USER_NAME" "$HOME_DIR/.config" "$HOME_DIR/.config/go-librespot"
install_file go-librespot.yml "$HOME_DIR/.config/go-librespot/config.yml" 644 "$USER_NAME" && spotify_changed=1
if install_file go-librespot.service /etc/systemd/system/go-librespot.service 644; then
    systemctl daemon-reload
    spotify_changed=1
fi
install_file control-tv-on /usr/local/lib/raspberry/control/tv-on 755 || true

# Before go-librespot: spotifyd, with hooks that wrote spotify.json and a sudo rule to disconnect
if [ -f /etc/systemd/system/spotifyd.service ]; then
    systemctl disable --now spotifyd
    rm -f /etc/systemd/system/spotifyd.service /usr/local/bin/spotifyd \
        /usr/local/bin/raspberry-spotify /usr/local/bin/raspberry-spotify-disconnect \
        /usr/local/lib/raspberry/control/spotify-disconnect /etc/sudoers.d/raspberry \
        /run/raspberry/spotify.json /run/raspberry/spotify.lock
    rm -rf "$HOME_DIR/.cache/spotifyd"
    systemctl daemon-reload
    echo "Removed spotifyd"
fi

systemctl enable --quiet go-librespot
if [ -n "$spotify_changed" ]; then
    systemctl restart go-librespot
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
