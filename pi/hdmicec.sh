#!/bin/bash
# The TV remote bridge: reads cec-client's log from stdin, turns remote buttons into key
# presses, wakes the app when the TV turns on or switches to the Pi's input, and puts it to
# sleep when the TV turns off or switches to another input.
# Installed as /usr/local/bin/raspberry-cec by setup.sh, started by ~/.bash_profile.
export DISPLAY=:0
export XAUTHORITY=/home/pipi/.Xauthority

# Whether the TV shows the Pi, for the app's start: "on" or "off"
TV_STATE=${TV_STATE:-/run/raspberry/tv}
# cec-client's commands, see bash_profile
CEC_COMMANDS=${CEC_COMMANDS:-/run/raspberry/cec}

# The Pi's HDMI address as it reports it ("<< 8f:84:30:00:04" is 3.0.0.0), in CEC's notation
PI_ADDRESS=30:00
# What the TV shows, or will show again when it turns back on: "pi", "other", or "" (not known yet)
shown=
# What the app was last told, so a burst of messages sends one key press
told=

# No remote button sends F13 or F14, so the app treats them as "wake up" and "sleep"
wake() {
    [ "$told" = on ] && return
    told=on
    echo on > "$TV_STATE"
    xdotool key F13
}

go_to_sleep() {
    [ "$told" = off ] && return
    told=off
    echo off > "$TV_STATE"
    xdotool key F14
}

# The TV switched to an input: the Pi, or anything else
switched_to() {
    if [ "$1" = "$PI_ADDRESS" ]; then
        shown=pi
        wake
    else
        shown=other
        go_to_sleep
    fi
}

# Reads the raw CEC messages ("TRAFFIC: [ms] >> 0f:36", from the TV (0) to everyone (f)) rather
# than libcec's notices about them: those come late or not at all. Bash patterns instead of grep:
# cec-client logs a lot, and a process per line adds up on a Pi.
while read -r line; do
    case "$line" in
        # "key pressed: select (0) current(1) duration(0)"
        *"key pressed: "*" current("*)
            [[ $line =~ key\ pressed:\ (.+)\ \([0-9a-f]+\)\ current ]] || continue
            # Named by libcec, see CECTypeUtils.h
            case "${BASH_REMATCH[1]}" in
                select) xdotool key Return ;;
                exit) xdotool key BackSpace ;;
                up) xdotool key Up ;;
                down) xdotool key Down ;;
                left) xdotool key Left ;;
                right) xdotool key Right ;;
                # The TCL 50C61K doesn't send numbers or channel up/down, other TVs might
                [0-9]) xdotool key "${BASH_REMATCH[1]}" ;;
                "channel up") xdotool key Prior ;;
                "channel down") xdotool key Next ;;
                # The colour buttons, as F16 to F19 (see xinitrc): Chromium keeps F1 to F4 for itself
                "F2 (red)") xdotool key F16 ;;
                "F3 (green)") xdotool key F17 ;;
                "F4 (yellow)") xdotool key F18 ;;
                "F1 (blue)") xdotool key F19 ;;
                # Shows which buttons the TV sends that do nothing yet: journalctl -t raspberry-cec
                *) logger -t raspberry-cec "Unused remote button: ${BASH_REMATCH[1]}" ;;
            esac
            ;;
        # The Pi reports its own address
        *"<< "?"f:84:"*)
            [[ $line =~ \<\<\ .f:84:([0-9a-f]{2}:[0-9a-f]{2}) ]] && PI_ADDRESS=${BASH_REMATCH[1]}
            ;;
        # The TV picks an input: Set Stream Path ("0f:86:30:00"), or Routing Change from one input
        # to another ("0f:80:00:00:30:00")
        *">> 0f:86:"* | *">> 0f:80:"*)
            [[ $line =~ :([0-9a-f]{2}:[0-9a-f]{2})$ ]] && switched_to "${BASH_REMATCH[1]}"
            ;;
        # A device says it's the one on screen: another player, or the TV itself (0f:82:00:00).
        # "<<" is the Pi saying so, after the TV asked or when Spotify turns the TV on.
        *">> "?"f:82:"* | *"<< "?"f:82:"*)
            [[ $line =~ :([0-9a-f]{2}:[0-9a-f]{2})$ ]] && switched_to "${BASH_REMATCH[1]}"
            ;;
        # The TV went to standby. It comes back on the input it showed, so `shown` stays.
        *">> 0f:36")
            go_to_sleep
            ;;
        # The TV is turning on: its first message is its address ("0f:84:00:00:00"). It comes back on
        # the input it showed last, so if that's the Pi (or it isn't known yet), wake up right away.
        *">> 0f:84:00:00:00"*)
            [ "$shown" != other ] && wake
            ;;
        # Then the TV asks which device is on screen ("0f:85"). The one that was should answer
        # (libcec forgets it was, over a standby): the TV then settles on it without waiting.
        *">> 0f:85")
            if [ "$shown" = pi ]; then
                echo as > "$CEC_COMMANDS"
                wake
            fi
            ;;
        # libcec's own view, from asking the TV now and then: in case the TV turns off or on
        # without saying so
        *"TV (0): power status changed from "*" to 'standby'")
            go_to_sleep
            ;;
        *"TV (0): power status changed from "*" to 'on'")
            [ "$shown" != other ] && wake
            ;;
    esac
done
