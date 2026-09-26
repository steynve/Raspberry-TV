#!/bin/bash
# The TV remote bridge: reads cec-client's log from stdin, turns remote buttons into key
# presses, wakes the app when the TV turns on or switches to the Pi's input, and puts it to
# sleep when the TV turns off or switches to another input.
# Installed as /usr/local/bin/raspberry-cec by setup.sh, started by ~/.bash_profile.
export DISPLAY=:0
export XAUTHORITY=/home/pipi/.Xauthority

# No remote button sends F13 or F14, so the app treats them as "wake up" and "sleep"
wake() {
    xdotool key F13
}

go_to_sleep() {
    xdotool key F14
}

# Bash patterns instead of grep: cec-client logs a lot, and a process per line adds up on a Pi
while read -r line; do
    case "$line" in
        # "key pressed: select (0) current(1) duration(0)"
        *"key pressed: "*" current("*)
            [[ $line =~ key\ pressed:\ (.+)\ \([0-9a-f]+\)\ current ]] || continue
            case "${BASH_REMATCH[1]}" in
                select) xdotool key Return ;;
                exit) xdotool key BackSpace ;;
                up) xdotool key Up ;;
                down) xdotool key Down ;;
                left) xdotool key Left ;;
                right) xdotool key Right ;;
                *) xdotool key "${BASH_REMATCH[1]}" ;;
            esac
            ;;
        # The TV switched its input to the Pi ("source activated"), or turned on
        *">> source activated: "* | *"TV (0): power status changed from "*" to 'on'")
            wake
            ;;
        # The TV switched to another input, or turned off: nobody can see or hear the Pi now
        *">> source deactivated: "* | *"TV (0): power status changed from "*" to 'standby'" | \
            *"TV (0): power status changed from "*" to 'in transition from on to standby'")
            go_to_sleep
            ;;
    esac
done
