import styles from "./StreakCard.module.css";

export default function StreakCard({ label, value, habit }) {
  return (
    <div className={styles.card} style={{ "--streak-color": habit?.habit_color }}>
      <span className={styles.label}>{label}</span>

      <div className={styles.ring}>
        <span className={styles.value}>{value}</span>
      </div>

      <span className={styles.habitName}>
        {habit?.habit_emoji || ""} {habit?.habit_name || "—"}
      </span>
    </div>
  );
}
