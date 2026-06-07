import Modal from "../ui/Modal.jsx";
import AchievementBadge from "./AchievementBadge.jsx";
import styles from "./AchievementUnlockedModal.module.css";

export default function AchievementUnlockedModal({ achievements, onClose }) {
  if (!achievements?.length) return null;

  return (
    <Modal isOpen title="Achievement Unlocked!" onClose={onClose}>
      <div className={styles.list}>
        {achievements.map((a) => (
          <AchievementBadge key={a.code} achievement={{ ...a, unlocked: true }} />
        ))}
      </div>
    </Modal>
  );
}
