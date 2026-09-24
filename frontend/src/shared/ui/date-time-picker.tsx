import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/ui/utils';

interface DateTimePickerProps {
  /** Value in "YYYY-MM-DDTHH:mm" format (same as datetime-local input) */
  value: string;
  onChange: (value: string) => void;
  /** Minimum selectable datetime in "YYYY-MM-DDTHH:mm" format */
  min?: string;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  min,
  placeholder = 'Pick date & time',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : null;
  const hasValidDate = parsedDate !== null && isValid(parsedDate);

  const dateStr = value.slice(0, 10);   // "YYYY-MM-DD"
  const timeStr = value.slice(11, 16) || '12:00'; // "HH:mm" 24h

  const [timeInput, setTimeInput] = React.useState(timeStr);
  const [timeError, setTimeError] = React.useState(false);

  // Keep local input in sync when external value changes (e.g. day pick resets time)
  React.useEffect(() => {
    setTimeInput(timeStr);
    setTimeError(false);
  }, [timeStr]);

  const minDate = min ? parse(min, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined;
  const fromDate = minDate && isValid(minDate) ? minDate : undefined;

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const newDateStr = format(day, 'yyyy-MM-dd');
    onChange(`${newDateStr}T${timeStr}`);
  };

  const handleTimeBlur = () => {
    const match = timeInput.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { setTimeError(true); return; }
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h > 23 || m > 59) { setTimeError(true); return; }
    setTimeError(false);
    const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (dateStr) onChange(`${dateStr}T${normalized}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-left bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-colors',
            !hasValidDate && 'text-gray-400',
            className,
          )}
        >
          <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={hasValidDate ? 'text-gray-900' : 'text-gray-400'}>
            {hasValidDate ? format(parsedDate!, 'MMM d, yyyy · h:mm a') : placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
        align="start"
      >
        <Calendar
          mode="single"
          selected={hasValidDate ? parsedDate! : undefined}
          onSelect={handleDaySelect}
          fromDate={fromDate}
          initialFocus
        />
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Time <span className="normal-case font-normal">(24h, HH:MM)</span></p>
          <input
            type="text"
            value={timeInput}
            placeholder="HH:MM"
            onChange={e => { setTimeInput(e.target.value); setTimeError(false); }}
            onBlur={handleTimeBlur}
            className={cn(
              'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white transition-colors',
              timeError
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-200 focus:ring-gray-900',
            )}
          />
          {timeError && (
            <p className="text-xs text-red-500 mt-1">Enter a valid time (00:00 – 23:59)</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}



