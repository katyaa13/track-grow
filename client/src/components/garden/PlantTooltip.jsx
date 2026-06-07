import { useState } from "react";
import { useGarden } from "../../hooks/useGarden.js";
import useStore from "../../store/useStore.js";
import Button from "../ui/Button.jsx";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import styles from "./PlantTooltip.module.css";

export default function PlantTooltip({ plant }) {
  const { restore } = useGarden();
  const { user } = useStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dropsBalance = user?.drops_balance ?? 0;
  const canRestore = dropsBalance >= 150;

  const handleRestore = async () => {
    setError("");
    setLoading(true);
    try {
      await restore(plant.id);
    } catch (err) {
      setError(err.response?.data?.error || "Could not restore plant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.tooltip} style={{ "--tooltip-border": plant.habit_color }}>
      <div className={styles.name}>
        {plant.habit_emoji} {plant.habit_name}
      </div>

      {plant.status === "active" && (
        <>
          <div className={styles.level}>Level {plant.level}</div>
          {plant.level < 6 ? (
            <div className={styles.info}>
              Complete <strong>{plant.completions_to_next_level}</strong> more{" "}
              {plant.completions_to_next_level === 1 ? "time" : "times"} to reach level {plant.level + 1}
            </div>
          ) : (
            <div className={styles.info}>Max level reached — keep it blooming! 🌸</div>
          )}
        </>
      )}

      {plant.status === "wilted" && (
        <>
          <div className={styles.level}>Level {plant.level} - wilted</div>
          <div className={styles.info}>You missed a period.</div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button size="xs" disabled={!canRestore || loading} onClick={handleRestore}>
            {loading ? "Restoring…" : "Restore for 150 💧"}
          </Button>
          {!canRestore && <p className={styles.hint}>You need {150 - dropsBalance} more 💧</p>}
        </>
      )}

      {plant.status === "dead" && (
        <>
          <div className={styles.level}>Lost: Level {plant.level}</div>
          <div className={styles.info}>Start completing the habit to grow a new plant.</div>
        </>
      )}
    </div>
  );
}
