#!/bin/bash
# Writes the Pi's health to /run/raspberry (RAM, served as /live/), where the TV app reads it every minute.
# setup.sh installs it as /usr/local/bin/raspberry-health, run every minute from /etc/cron.d:
#   * * * * * root /usr/local/bin/raspberry-health
TARGET=/run/raspberry/health.json

temperature=$(awk '{ printf "%.1f", $1 / 1000 }' /sys/class/thermal/thermal_zone0/temp)
uptime=$(cut -d. -f1 /proc/uptime)
memory_total=$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)
memory_available=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)
load=$(cut -d' ' -f1 /proc/loadavg)
disk=$(df --output=pcent / | tail -1 | tr -dc '0-9')
throttled=$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2)

# Missing readings become null. Write to a temporary file first, so the app never reads a half-written file
printf '{"time":%s,"temperature":%s,"uptime":%s,"memoryTotal":%s,"memoryAvailable":%s,"load":%s,"disk":%s,"throttled":"%s"}\n' \
    "$(date +%s)" "${temperature:-null}" "${uptime:-null}" "${memory_total:-null}" "${memory_available:-null}" \
    "${load:-null}" "${disk:-null}" "${throttled:-unknown}" \
    > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
