export const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export const getQuestionButtonClassName = (
  index: number,
  currentQuestionIndex: number,
  answered: boolean,
  flagged: boolean,
) => {
  const base = 'w-9 h-9 text-xs font-semibold rounded-lg transition-colors relative ';

  if (currentQuestionIndex === index) {
    return `${base}bg-gray-900 text-white`;
  }

  if (answered && flagged) {
    return `${base}bg-gray-300 text-gray-700 ring-2 ring-gray-500 ring-offset-1`;
  }

  if (answered) {
    return `${base}bg-gray-200 text-gray-700`;
  }

  if (flagged) {
    return `${base}bg-white text-gray-600 border-2 border-gray-400`;
  }

  return `${base}bg-gray-100 text-gray-500 hover:bg-gray-200`;
};
