export function formatSeconds(value?: number | null): string {
  if (value === null || value === undefined) return 'No data';
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

export function scoreTone(score?: number | null): string {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score < 45) return 'text-red-600';
  if (score < 65) return 'text-amber-600';
  return 'text-emerald-600';
}
