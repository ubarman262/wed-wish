import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Calendar } from "./calendar";
import { Input } from "./input";

export default function DatePicker({ value, onChange, showTime = true }) {
  const parseISO = (iso) => (iso ? new Date(iso) : null);
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(parseISO(value) || null);
  const [time, setTime] = React.useState(() => {
    if (!value) return "09:00";
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  React.useEffect(() => {
    setDate(parseISO(value));
    if (value) {
      const d = new Date(value);
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
  }, [value]);

  const commit = (nextDate, nextTime) => {
    if (!nextDate) { onChange(null); return; }
    const d = new Date(nextDate);
    if (showTime && nextTime) {
      const [hh, mm] = nextTime.split(":");
      d.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    onChange(d.toISOString());
  };

  const display = () => {
    if (!date) return "Choose date";
    const opts = showTime
      ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }
      : { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" };
    return new Date(date).toLocaleString("en-IN", opts);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2">
          <Input readOnly value={display()} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="flex gap-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              commit(d, time);
            }}
          />
          {showTime && (
            <div className="flex flex-col">
              <label className="text-[12px] mb-2">Time (IST)</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (date) commit(date, e.target.value);
                }}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
