#!/usr/bin/env python3
"""Called by spotifyd on every player event, with PLAYER_EVENT and TRACK_ID in the environment,
and by cron every minute with PLAYER_EVENT=sync.

Reads what's playing from spotifyd's MPRIS interface, writes it to /run/raspberry/spotify.json
for the TV app, and tells the app with F15. When music starts while the TV is off or on another
input, it turns the TV on and switches it to the Pi, like a Chromecast: the TV is the Pi's speaker.
Installed as /usr/local/bin/raspberry-spotify.
"""
import fcntl
import json
import os
import subprocess
import time

STATE = '/run/raspberry/spotify.json'
LOCK = '/run/raspberry/spotify.lock'
# Written by the remote bridge (hdmicec.sh): "on" while the TV shows the Pi, "off" when it doesn't
TV_STATE = '/run/raspberry/tv'
# Read by cec-client, see bash_profile
CEC_COMMANDS = '/run/raspberry/cec'
# Turning the TV off pauses Spotify (the app does that), but the pause takes a moment. A song that
# starts in that moment shouldn't turn the TV right back on.
TV_OFF_GRACE = 10  # seconds
# Only what changes the screen. spotifyd also reports volume, shuffle, preloading and the like,
# up to four events within a second at a track change.
SHOWN = {'sessionconnected', 'load', 'start', 'change', 'play', 'playing', 'pause', 'paused',
         'stop', 'stopped', 'endoftrack', 'sessiondisconnected', 'unavailable',
         # Not from spotifyd: cron runs the hook with "sync" every minute, so a state that ever went
         # wrong (like a missed event) corrects itself
         'sync'}
ENDED = {'sessiondisconnected', 'unavailable'}
# Events whose TRACK_ID is the track now playing (endoftrack and preload name other tracks)
NEW_TRACK = {'load', 'start', 'change'}
# Events that say for themselves whether music plays: more reliable than MPRIS, which briefly
# reports "Stopped" while it switches tracks
PLAYING = {'start', 'play', 'playing'}
PAUSED = {'pause', 'paused', 'stop', 'stopped'}
ENV = {
    **os.environ,
    'XDG_RUNTIME_DIR': '/run/user/1000',
    'DBUS_SESSION_BUS_ADDRESS': 'unix:path=/run/user/1000/bus',
    'DISPLAY': ':0',
    'XAUTHORITY': '/home/pipi/.Xauthority',
}


def busctl(*args):
    return subprocess.run(['busctl', '--user', *args], capture_output=True, text=True, env=ENV, timeout=5)


# spotifyd's connection to the session bus, by its unique name (":1.x"). Not by its MPRIS name
# (org.mpris.MediaPlayer2.spotifyd...), which spotifyd loses when it reconnects to Spotify.
def player():
    for line in busctl('list', '--no-legend').stdout.splitlines():
        fields = line.split()
        if len(fields) > 2 and fields[0].startswith(':') and fields[2] == 'spotifyd':
            return fields[0]
    return None


def read(name):
    result = busctl('--json=short', 'get-property', name, '/org/mpris/MediaPlayer2',
                    'org.mpris.MediaPlayer2.Player', 'Metadata', 'PlaybackStatus')
    lines = [json.loads(line) for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 2:
        return None, None
    metadata = {key: value['data'] for key, value in lines[0]['data'].items()}
    return metadata, lines[1]['data']


def tv_is_off():
    try:
        with open(TV_STATE) as file:
            off = file.read().strip() == 'off'
        return off and time.time() - os.path.getmtime(TV_STATE) > TV_OFF_GRACE
    except OSError:
        # Nothing heard from the TV since the Pi started
        return True


# "on 0" turns on the TV (CEC address 0), "as" makes the Pi the active source: the TV switches to
# it, and tells the app to wake up (F13, see hdmicec.sh)
def wake_tv():
    try:
        # Non-blocking, so it fails right away when cec-client isn't running, instead of waiting
        pipe = os.open(CEC_COMMANDS, os.O_WRONLY | os.O_NONBLOCK)
    except OSError:
        return
    with os.fdopen(pipe, 'w') as commands:
        commands.write('on 0\nas\n')
    # Once is enough: the next song shouldn't send it again, even if the TV never reports back
    with open(TV_STATE, 'w') as file:
        file.write('on\n')


def main():
    event = os.environ.get('PLAYER_EVENT', '')
    if event not in SHOWN:
        return

    # Right away, the TV takes a few seconds to come on
    if event in PLAYING and tv_is_off():
        wake_tv()

    # spotifyd starts a hook per event without waiting: take turns, so the last event writes last
    with open(LOCK, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        update(event)


def update(event):
    track_id = os.environ.get('TRACK_ID', '') if event in NEW_TRACK else ''
    metadata, status = {}, 'Stopped'
    name = None if event in ENDED else player()
    # MPRIS lags a moment behind a track change: wait until it reports the new track, playing or
    # paused, rather than the "Stopped" in between
    for _ in range(10):
        if not name:
            break
        metadata, status = read(name)
        metadata = metadata or {}
        fresh = not track_id or track_id in str(metadata.get('mpris:trackid', ''))
        if fresh and status in ('Playing', 'Paused'):
            break
        time.sleep(0.2)

    if event in PLAYING:
        playing = True
    elif event in PAUSED:
        playing = False
    else:
        playing = status == 'Playing'

    title = os.environ.get('TRACK_NAME') or metadata.get('xesam:title', '')
    artists = metadata.get('xesam:artist') or []
    state = {
        'time': int(time.time()),
        'active': event not in ENDED and bool(title),
        'playing': playing and event not in ENDED,
        # The event itself names the track, MPRIS adds the artist and album
        'title': title,
        'artist': ', '.join(artists) if isinstance(artists, list) else str(artists),
        'album': metadata.get('xesam:album', ''),
        'cover': metadata.get('mpris:artUrl', ''),
    }

    # Write the whole file at once, so the app never reads half of it
    with open(STATE + '.tmp', 'w') as file:
        json.dump(state, file)
    os.replace(STATE + '.tmp', STATE)

    # No remote button sends F15, the app reads it as "Spotify changed"
    subprocess.run(['xdotool', 'key', 'F15'], env=ENV, check=False)


if __name__ == '__main__':
    main()
