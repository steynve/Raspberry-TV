export const formatTime = (date: Date): string =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// 130 → "2h 10m", 42 → "42m"
export const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return hours ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${rest}m`;
};
