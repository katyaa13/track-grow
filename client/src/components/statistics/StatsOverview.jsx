import { useCallback, useEffect, useMemo, useState } from "react";
import { localDateString, useHabits } from "../../hooks/useHabits.js";
import { useStatistics } from "../../hooks/useStatistics.js";
import CalendarHeatmap from "./CalendarHeatmap.jsx";
import HabitFilter from "./HabitFilter.jsx";
import styles from "./StatsOverview.module.css";
import StreakCard from "./StreakCard.jsx";

function periodLabel(frequency) {
  const labels = {
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    yearly: "years",
  };
  return labels[frequency] ?? "periods";
}

export default function StatsOverview() {
  const { statistics, loadStats, loadCalendar } = useStatistics();
  const { habits, load: loadHabits } = useHabits();
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const handleMonthChange = useCallback((year, month) => {
    setCalendarMonth(`${year}-${String(month + 1).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    loadHabits(localDateString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadStats(selectedHabit);
  }, [selectedHabit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCalendar(selectedHabit, calendarMonth);
  }, [selectedHabit, calendarMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedHabitData = useMemo(() => {
    if (!selectedHabit || !habits?.length) return null;
    return habits.find((h) => h.id === selectedHabit) ?? null;
  }, [habits, selectedHabit]);

  const period = periodLabel(selectedHabitData?.frequency ?? null);
  const selectedHabitColor = selectedHabitData?.color ?? null;

  const activeFrom = useMemo(() => {
    if (!habits?.length) return null;

    if (selectedHabit) {
      const habit = habits.find((h) => h.id === selectedHabit);
      return habit?.created_at ? String(habit.created_at).slice(0, 10) : null;
    }

    const dates = habits.map((h) => (h.created_at ? String(h.created_at).slice(0, 10) : null)).filter(Boolean);
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  }, [habits, selectedHabit]);

  if (!statistics) {
    return <div className={styles.loading}>Loading statistics…</div>;
  }

  const { streaks, stats, current_streaks, calendar } = statistics;

  const visibleStreaks = selectedHabit ? current_streaks?.filter((s) => s.habit_id === selectedHabit) : current_streaks;

  return (
    <div className={styles.wrapper}>
      <div className={styles.filterBar}>
        <HabitFilter habits={habits} selected={selectedHabit} onSelect={setSelectedHabit} />
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Best Streaks</h3>
          <div className={styles.streakRow}>
            <StreakCard
              label="Current"
              value={streaks?.current ?? 0}
              habit={{
                habit_name: streaks?.current_habit_name,
                habit_emoji: streaks?.current_habit_emoji,
                habit_color: streaks?.current_habit_color,
              }}
            />
            <StreakCard
              label="All-Time"
              value={streaks?.best ?? 0}
              habit={{
                habit_name: streaks?.best_habit_name,
                habit_emoji: streaks?.best_habit_emoji,
                habit_color: streaks?.best_habit_color,
              }}
            />
          </div>

          {visibleStreaks?.length > 0 && (
            <>
              <h4 className={styles.subTitle}>Current Streaks</h4>
              <div className={styles.streakList}>
                {visibleStreaks.map((s) => (
                  <div key={s.habit_id} className={styles.streakListItem} style={{ "--streak-border": s.habit_color }}>
                    <div className={styles.streakLeft}>
                      <span className={styles.streakNum}>🔥 {s.current_streak}</span>
                      <span className={styles.streakHabit}>
                        {s.habit_emoji} {s.habit_name}
                      </span>
                    </div>
                    <div className={styles.streakRight}>
                      <span className={styles.streakPlant}>🌱 Lvl {s.level} plant</span>
                      <span className={styles.streakPlantHint}>
                        {" · "}
                        {3 - (s.current_streak % 3)} completions left to level up
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className={styles.rightColumn}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Performance</h3>
            <div className={styles.statsCard}>
              <div className={styles.statItem}>
                <span>
                  Successful
                  <br />
                  {period}
                </span>
                <div className={styles.statRing}>{stats?.successful_periods ?? 0}</div>
              </div>
              <div className={styles.statItem}>
                <span>
                  Failed
                  <br />
                  {period}
                </span>
                <div className={styles.statRing}>{stats?.failed_periods ?? 0}</div>
              </div>
              <div className={styles.statItem}>
                <span>
                  Overall
                  <br />
                  success rate
                </span>
                <div className={styles.statRing}>{stats?.overall_success_rate ?? 0}%</div>
              </div>
              <div className={styles.statItem}>
                <span>
                  Today's
                  <br />
                  progress
                </span>
                <div className={styles.statRing}>{stats?.current_completion_rate ?? 0}%</div>
              </div>
            </div>
          </section>

          <CalendarHeatmap
            dailyData={calendar}
            activeFrom={activeFrom}
            onMonthChange={handleMonthChange}
            habitColor={selectedHabitColor}
          />
        </div>
      </div>
    </div>
  );
}
