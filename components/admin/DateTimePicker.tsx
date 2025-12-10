'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
}

// Generate hours array (00-23)
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Generate minutes array (00, 15, 30, 45)
const minutes = ['00', '15', '30', '45'];

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date and time',
  disabled = false,
  minDate,
  className,
}: DateTimePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState(
    date ? format(date, 'HH') : '09'
  );
  const [selectedMinute, setSelectedMinute] = React.useState(
    date ? format(date, 'mm') : '00'
  );

  // Update time when date changes externally
  React.useEffect(() => {
    if (date) {
      setSelectedHour(format(date, 'HH'));
      // Round to nearest 15 minutes
      const mins = date.getMinutes();
      const roundedMins = Math.round(mins / 15) * 15;
      setSelectedMinute(roundedMins.toString().padStart(2, '0'));
    }
  }, [date]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateChange(undefined);
      return;
    }

    // Combine date with selected time
    const newDate = new Date(selectedDate);
    newDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
    onDateChange(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    if (type === 'hour') {
      setSelectedHour(value);
    } else {
      setSelectedMinute(value);
    }

    if (date) {
      const newDate = new Date(date);
      if (type === 'hour') {
        newDate.setHours(parseInt(value), parseInt(selectedMinute), 0, 0);
      } else {
        newDate.setHours(parseInt(selectedHour), parseInt(value), 0, 0);
      }
      onDateChange(newDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP HH:mm') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(d) => (minDate ? d < minDate : false)}
          initialFocus
        />
        <div className="border-t p-3">
          <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Time
          </Label>
          <div className="flex items-center gap-2">
            <Select value={selectedHour} onValueChange={(v) => handleTimeChange('hour', v)}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={selectedMinute} onValueChange={(v) => handleTimeChange('minute', v)}>
              <SelectTrigger className="w-[80px]">
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateTimePicker;
