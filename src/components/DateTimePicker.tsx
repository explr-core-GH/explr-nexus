import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date and time',
  disabled = false,
  minDate = new Date(),
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ['00', '15', '30', '45'];

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      if (value) {
        newDate.setHours(value.getHours(), value.getMinutes());
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
      onChange(newDate);
    } else {
      onChange(undefined);
    }
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'period', val: string) => {
    if (!value) return;

    const newDate = new Date(value);
    const currentHours = newDate.getHours();
    const isPM = currentHours >= 12;

    if (type === 'hour') {
      let hour = parseInt(val);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      newDate.setHours(hour);
    } else if (type === 'minute') {
      newDate.setMinutes(parseInt(val));
    } else if (type === 'period') {
      let hour = currentHours;
      if (val === 'PM' && hour < 12) hour += 12;
      if (val === 'AM' && hour >= 12) hour -= 12;
      newDate.setHours(hour);
    }

    onChange(newDate);
  };

  const getDisplayHour = () => {
    if (!value) return '';
    let hour = value.getHours() % 12;
    return hour === 0 ? '12' : hour.toString();
  };

  const getDisplayMinute = () => {
    if (!value) return '';
    const minute = value.getMinutes();
    return minute.toString().padStart(2, '0');
  };

  const getDisplayPeriod = () => {
    if (!value) return 'AM';
    return value.getHours() >= 12 ? 'PM' : 'AM';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP h:mm a') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          initialFocus
          className="pointer-events-auto"
        />
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={getDisplayHour()}
              onValueChange={(val) => handleTimeChange('hour', val)}
              disabled={!value}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={getDisplayMinute()}
              onValueChange={(val) => handleTimeChange('minute', val)}
              disabled={!value}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={getDisplayPeriod()}
              onValueChange={(val) => handleTimeChange('period', val)}
              disabled={!value}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border-t p-2 flex justify-end">
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface PreferredDatesPickerProps {
  dates: Date[];
  onChange: (dates: Date[]) => void;
  maxDates?: number;
}

export function PreferredDatesPicker({
  dates,
  onChange,
  maxDates = 3,
}: PreferredDatesPickerProps) {
  const addDate = () => {
    if (dates.length < maxDates) {
      onChange([...dates, new Date()]);
    }
  };

  const updateDate = (index: number, date: Date | undefined) => {
    if (date) {
      const newDates = [...dates];
      newDates[index] = date;
      onChange(newDates);
    }
  };

  const removeDate = (index: number) => {
    onChange(dates.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {dates.map((date, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <DateTimePicker
              value={date}
              onChange={(d) => updateDate(index, d)}
              placeholder={`Option ${index + 1}`}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeDate(index)}
            className="h-9 w-9 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {dates.length < maxDates && (
        <Button
          type="button"
          variant="outline"
          onClick={addDate}
          className="w-full"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Add Pickup Option {dates.length + 1}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Add up to {maxDates} preferred pickup date/time options
      </p>
    </div>
  );
}
