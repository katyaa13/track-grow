import { useEffect } from "react";
import { useAchievements } from "../../hooks/useAchievements.js";
import AchievementBadge from "./AchievementBadge.jsx";
import styles from "./AchievementGrid.module.css";

const SECTIONS = [
  { key: "basic", label: "Basic" },
  { key: "advanced", label: "Advanced" },
  { key: "rare", label: "Rare" },
];

export default function AchievementGrid() {
  const { achievements, load } = useAchievements();

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byDifficulty = SECTIONS.reduce((acc, { key }) => {
    acc[key] = achievements.filter((a) => a.difficulty === key);
    return acc;
  }, {});

  return (
    <div className={styles.wrapper}>
      {SECTIONS.map(({ key, label }) => (
        <section key={key} className={styles.section}>
          <h3 className={styles.sectionTitle}>{label}</h3>
          <div className={styles.grid}>
            {byDifficulty[key]?.map((a) => (
              <AchievementBadge key={a.id} achievement={a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
