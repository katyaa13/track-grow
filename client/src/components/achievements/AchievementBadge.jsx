import advancedLocked from "../../assets/achievements/advanced-locked.svg";
import advancedUnlocked from "../../assets/achievements/advanced-unlocked.svg";
import basicLocked from "../../assets/achievements/basic-locked.svg";
import basicUnlocked from "../../assets/achievements/basic-unlocked.svg";
import rareLocked from "../../assets/achievements/rare-locked.svg";
import rareUnlocked from "../../assets/achievements/rare-unlocked.svg";
import styles from "./AchievementBadge.module.css";

const UNLOCKED_IMGS = {
  basic: basicUnlocked,
  advanced: advancedUnlocked,
  rare: rareUnlocked,
};
const LOCKED_IMGS = {
  basic: basicLocked,
  advanced: advancedLocked,
  rare: rareLocked,
};

export default function AchievementBadge({ achievement }) {
  const { title, description, difficulty, unlocked, points, progress_current, target_value } = achievement;

  const imgSrc = unlocked ? UNLOCKED_IMGS[difficulty] || basicUnlocked : LOCKED_IMGS[difficulty] || basicLocked;

  const isRare = difficulty === "rare";

  return (
    <div className={[styles.badge, unlocked ? styles.unlocked : styles.locked].join(" ")}>
      <img src={imgSrc} alt={difficulty} className={[styles.img, isRare ? styles["img--rare"] : ""].join(" ")} />
      <span className={styles.title}>{title}</span>
      <span className={styles.desc}>{description}</span>
      <span className={unlocked ? styles["reward--unlocked"] : styles["reward--locked"]}>Reward: {points} XP</span>
      {unlocked ? (
        <span className={styles.progress}>✓ Completed</span>
      ) : (
        <span className={styles.progress}>
          Progress: {progress_current ?? 0}/{target_value ?? 1}
        </span>
      )}
    </div>
  );
}
