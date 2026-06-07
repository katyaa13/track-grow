import { useMemo } from "react";
import { localDateString } from "../../hooks/useHabits.js";
import styles from "./HorizontalCalendar.module.css";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MS_PER_DAY = 86400000;
const WINDOW_DAYS = 31;

function toUtcMs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToIso(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getWindowDays(centerDate, count) {
  const centerMs = toUtcMs(centerDate);
  const half = Math.floor(count / 2);
  const days = [];
  for (let i = -half; i <= half; i++) {
    days.push(new Date(centerMs + i * MS_PER_DAY));
  }
  return days;
}

export default function HorizontalCalendar({ selectedDate, onSelect }) {
  const today = localDateString();

  const days = useMemo(() => getWindowDays(selectedDate, WINDOW_DAYS), [selectedDate]);

  const shift = (delta) => {
    const next = new Date(toUtcMs(selectedDate) + delta * MS_PER_DAY);
    onSelect(utcToIso(next));
  };

  const dateLabel = new Date(toUtcMs(selectedDate)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.monthRow}>
        <span className={styles.month}>{dateLabel}</span>
      </div>
      <div className={styles.scrollRow}>
        <button className={styles.arrow} onClick={() => shift(-7)}>
          ‹
        </button>

        <div className={styles.days}>
          {days.map((d) => {
            const iso = utcToIso(d);
            const isSelected = iso === selectedDate;
            const isToday = iso === today;

            return (
              <button
                key={iso}
                className={[styles.day, isSelected ? styles.selected : "", isToday && !isSelected ? styles.today : ""]
                  .join(" ")
                  .trim()}
                onClick={() => onSelect(iso)}
                tabIndex={isSelected ? 0 : -1}
              >
                <span className={styles.dayName}>{DAY_NAMES[d.getUTCDay()]}</span>
                <span className={styles.dayNum}>{d.getUTCDate()}</span>
              </button>
            );
          })}
        </div>

        <button className={styles.arrow} onClick={() => shift(7)}>
          ›
        </button>
      </div>
    </div>
  );
}
