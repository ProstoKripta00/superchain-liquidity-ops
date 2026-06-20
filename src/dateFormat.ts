const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatUtcDateTime(value: Date | number | string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return `${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCDate())}, ${date.getUTCFullYear()}, ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())} UTC`;
}
