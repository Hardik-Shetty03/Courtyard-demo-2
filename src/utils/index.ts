// src/utils/index.ts

export const formatCurrency = (amount: number, symbol = '₹') => {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (isoString: string): string => {
  return `${formatDate(isoString)}, ${formatTime(isoString)}`;
};

export const getElapsedMinutes = (startTime: string): number => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 60000);
};

export const getElapsedDisplay = (startTime: string): string => {
  const minutes = getElapsedMinutes(startTime);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const calculateCourtCharge = (startTime: string, hourlyRate: number): number => {
  const minutes = getElapsedMinutes(startTime);
  const hours = minutes / 60;
  return Math.ceil(hours * hourlyRate);
};

export const getTimeAgo = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ');
