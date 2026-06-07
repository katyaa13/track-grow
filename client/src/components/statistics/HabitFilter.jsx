import styles from "./HabitFilter.module.css";

export default function HabitFilter({ habits, selected, onSelect }) {
  return (
    <div className={styles.bar}>
      <button
        className={[styles.tab, selected === null ? styles.active : ""].join(" ")}
        onClick={() => onSelect(null)}
        style={{
          "--habit-color": "var(--color-primary-dark)",
        }}
      >
        All habits
      </button>
      {habits.map((h) => (
        <button
          key={h.id}
          className={[styles.tab, selected === h.id ? styles.active : ""].join(" ")}
          onClick={() => onSelect(h.id)}
          style={{
            "--habit-color": h.color,
          }}
        >
          {h.emoji} {h.name}
        </button>
      ))}
    </div>
  );
}
