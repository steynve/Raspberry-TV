#!/bin/bash
# Lets go of the phone, like a Bluetooth speaker that's switched off: pauses Spotify, then takes the
# Pi off Spotify, so the phone drops it and keeps the song paused on itself. spotifyd's MPRIS Quit
# stops it, and systemd starts it again 5 seconds later (Restart=always, see spotifyd.service),
# ready for the next cast. Its Stop only ends the session: the phone then still shows Raspberry.
# Installed as /usr/local/bin/raspberry-spotify-disconnect.
# Runs as pipi: the TV app calls it through /control/spotify-disconnect, see the sudoers file.
export XDG_RUNTIME_DIR=/run/user/1000
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

# spotifyd's unique bus name: its MPRIS name disappears when it reconnects to Spotify
name=$(busctl --user list --no-legend | awk '$1 ~ /^:/ && $3 == "spotifyd" { print $1; exit }')
[ -n "$name" ] || exit 1

# spotifyd only has its player on D-Bus while a phone is connected
busctl --user call "$name" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player Pause || exit 1
busctl --user call "$name" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2 Quit
