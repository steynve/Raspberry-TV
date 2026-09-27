#!/bin/bash
# Pauses Spotify through spotifyd's MPRIS interface. Installed as /usr/local/bin/raspberry-spotify-pause.
# Runs as pipi: the TV app calls it through /control/spotify-pause, see the sudoers file.
export XDG_RUNTIME_DIR=/run/user/1000
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

# spotifyd's unique bus name: its MPRIS name disappears when it reconnects to Spotify
name=$(busctl --user list --no-legend | awk '$1 ~ /^:/ && $3 == "spotifyd" { print $1; exit }')
[ -n "$name" ] && busctl --user call "$name" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player Pause
