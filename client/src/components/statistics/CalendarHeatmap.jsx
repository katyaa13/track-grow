import { useEffect, useState } from "react";
import styles from "./CalendarHeatmap.module.css";

const DAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CalendarHeatmap({ dailyData, activeFrom, onMonthChange, habitColor }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    onMonthChange?.(viewYear, viewMonth);
  }, [viewYear, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstOffset = getFirstDayOfWeek(viewYear, viewMonth);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className={styles.wrapper} style={{ "--calendar-habit-color": habitColor }}>
      <h3 className={styles.title}>Calendar</h3>

      <div className={styles.header}>
        <button className={styles.navBtn} onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <span className={styles.monthTitle}>{monthName}</span>
        <button className={styles.navBtn} onClick={() => shiftMonth(1)} disabled={isCurrentMonth}>
          ›
        </button>
      </div>

      <div className={styles.dayHeaders}>
        {DAY_HEADERS.map((d) => (
          <div key={d} className={styles.weekdayCell}>
            <span className={styles.dayHeader}>{d}</span>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: firstOffset }, (_, i) => (
          <div key={`pad-${i}`} className={styles.daySpacer} />
        ))}

        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;

          const isFuture = dateStr > todayStr;
          const isInactive = isFuture || (activeFrom != null && dateStr < activeFrom);
          const pct = dailyData?.[dateStr] ?? null;
          const hasData = !isFuture && !isInactive && pct !== null && pct > 0;

          const ringClass = [
            styles.progressRing,
            isFuture ? styles.futureRing : "",
            isInactive ? styles.inactiveRing : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={day} className={styles.dayCell}>
              <div
                className={ringClass}
                title={isFuture ? "" : isInactive ? "No habit yet" : hasData ? `${pct}% completed` : ""}
              >
                <div className={styles.progressBg} />
                {hasData && <div className={styles.progressFill} style={{ "--pct": `${pct}%` }} />}
                <div className={styles.innerCircle}>
                  <span className={styles.dayNum}>{day}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
