export type KeyboardEventKey =
    | 'ArrowUp'
    | 'ArrowRight'
    | 'ArrowDown'
    | 'ArrowLeft'
    | 'Enter'
    | 'Backspace'
    | 'F1' // D BLUE
    | 'F2' // A RED
    | 'F3' // B GREEN
    | 'F4' // C YELLOW
    | 'F13' // Not on the remote: sent by pi/hdmicec.sh when the TV turns on or switches to the Pi
    | 'F14' // Not on the remote: sent by pi/hdmicec.sh when the TV turns off or switches away
    | 'F15' // Not on the remote: sent by pi/spotify-event.py when Spotify changes
    | '0'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9';
