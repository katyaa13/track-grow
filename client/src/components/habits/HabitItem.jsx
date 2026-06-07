import { localDateString } from "../../hooks/useHabits.js";
import useStore from "../../store/useStore.js";
import { LeftIndicator, RightControls, useCounterState, useTimerState } from "./CompletionControls.jsx";
import styles from "./HabitItem.module.css";

function formatTarget(habit) {
  if (!habit.target_value) return "";
  if (habit.tracking_type === "timer") {
    const sec = habit.target_value;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" ") + " · ";
  }
  return `${habit.target_value} · `;
}

function frequencyLabel(frequency) {
  const labels = {
    daily: "Every day",
    weekly: "Every week",
    monthly: "Every month",
    yearly: "Every year",
  };
  return labels[frequency] ?? frequency ?? "";
}

export default function HabitItem({
  habit,
  completed,
  onStart,
  onComplete,
  onUncomplete,
  onProgress,
  onDeleteProgress,
  selectedDate,
}) {
  const { openHabitForm } = useStore();
  const today = localDateString();
  const isLocked = selectedDate > today;

  const completedValue = habit.completed_value ?? null;
  const progressValue = habit.progress_value ?? null;
  const isTimer = habit.tracking_type === "timer";

  const colorVars = habit.color ? { "--habit-color": habit.color } : {};

  const counterState = useCounterState(
    habit,
    completed,
    progressValue,
    (v) => !isLocked && onComplete(habit.id, v),
    (v) => !isLocked && onUncomplete(habit.id, v),
    (v) => !isLocked && onProgress(habit.id, v),
  );

  const timerState = useTimerState(
    habit,
    selectedDate,
    completed,
    isTimer ? completedValue : null,
    isTimer ? progressValue : null,
    isTimer ? (habit.timer_started_at ?? null) : null,
    isTimer ? (() => !isLocked && onStart(habit.id)) : null,
    (v) => !isLocked && onComplete(habit.id, v),
    isTimer ? (v) => !isLocked && onProgress(habit.id, v) : null,
  );

  return (
    <div className={styles.item} style={colorVars}>
      <LeftIndicator
        habit={habit}
        completed={completed}
        isLocked={isLocked}
        onComplete={() => !isLocked && onComplete(habit.id, null)}
        onUncomplete={() => !isLocked && onUncomplete(habit.id)}
        timerState={timerState}
        counterState={counterState}
      />

      <div className={styles.info}>
        <span className={styles.name}>
          {habit.emoji && <span className={styles.emoji}>{habit.emoji}</span>}
          {habit.name}
        </span>
        <span className={styles.meta}>
          {formatTarget(habit)}
          {frequencyLabel(habit.frequency)}
        </span>
      </div>

      <div className={styles.right}>
        {!isLocked && (
          <RightControls
            habit={habit}
            timerState={timerState}
            counterState={counterState}
            onDeleteProgress={completed ? () => onUncomplete?.(habit.id) : () => onDeleteProgress?.(habit.id)}
          />
        )}
        <button className={styles.menuBtn} onClick={() => openHabitForm(habit)}>
          ⋮
        </button>
      </div>
    </div>
  );
}
