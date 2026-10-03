// The TV remote, as key presses from pi/hdmicec.sh
export type KeyboardEventKey =
    | 'ArrowUp'
    | 'ArrowRight'
    | 'ArrowDown'
    | 'ArrowLeft'
    | 'Enter'
    | 'Backspace'
    | 'PageUp' // Channel up
    | 'PageDown' // Channel down
    | 'F13' // Not on the remote: sent by pi/hdmicec.sh when the TV turns on or switches to the Pi
    | 'F14' // Not on the remote: sent by pi/hdmicec.sh when the TV turns off or switches away
    | ColourKey
    | Digit;

// The colour buttons. Not F1 to F4, which Chromium keeps for itself (F1 opens its help).
export type ColourKey = 'F16' | 'F17' | 'F18' | 'F19';

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export const isDigit = (key: string): key is Digit => /^[0-9]$/.test(key);
