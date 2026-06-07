import { useLocation, useNavigate } from "react-router-dom";
import useStore from "../../store/useStore.js";
import Button from "../ui/Button.jsx";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { key: "habits", label: "Habits", icon: "📋" },
  { key: "garden", label: "Garden", icon: "🌿" },
  { key: "statistics", label: "Statistics", icon: "📊" },
  { key: "achievements", label: "Achievements", icon: "🏆" },
];

const MAX_XP = 2000;
const XP_PER_LEVEL = 500;
const MAX_LEVEL = Math.floor(MAX_XP / XP_PER_LEVEL) + 1;

export default function Sidebar({ isOpen, onClose }) {
  const { user, setProfileModalOpen } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.slice(1) || "habits";

  const totalXp = user?.total_xp ?? 0;

  const level = Math.min(Math.floor(totalXp / XP_PER_LEVEL) + 1, MAX_LEVEL);

  const isMaxLevel = totalXp >= MAX_XP;

  const xpCurrent = isMaxLevel ? XP_PER_LEVEL : totalXp % XP_PER_LEVEL;

  const xpToNext = XP_PER_LEVEL;

  const xpPct = isMaxLevel ? 100 : Math.round((xpCurrent / xpToNext) * 100);

  const openProfile = () => {
    setProfileModalOpen(true);
    onClose();
  };

  const handleNavClick = (key) => {
    navigate(`/${key}`);
    onClose();
  };

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      <aside className={[styles.sidebar, isOpen ? styles.open : ""].join(" ")}>
        <div className={styles.logoArea}>
          <span className={styles.logo}>🌱 Track&amp;Grow</span>
        </div>

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
        </div>

        <div className={styles.profile}>
          <div className={styles.avatarRow}>
            <button className={styles.avatarBtn} onClick={openProfile}>
              {user?.avatar_data ? (
                <img src={user.avatar_data} alt="avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>{(user?.username || "U")[0].toUpperCase()}</div>
              )}
            </button>

            <div className={styles.nameColumn}>
              <span className={styles.username}>{user?.username || "—"}</span>
              <span className={styles.level}>🏆 Level {level}</span>
            </div>
          </div>

          <div className={styles.xpBar}>
            <div className={styles.xpFill} style={{ width: `${xpPct}%` }} />
          </div>

          <span className={styles.xpLabel}>
            {isMaxLevel ? "Maximum level reached" : `${xpCurrent} / ${xpToNext} XP to next level`}
          </span>

          <span className={styles.drops}>💧 {user?.drops_balance ?? 0} drops</span>
        </div>

        <div className={styles.profileBtnWrapper}>
          <Button size="sm" onClick={openProfile}>
            ⚙️ Profile Settings
          </Button>
        </div>

        <div className={styles.spacer} />

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
        </div>

        <div className={styles.navLabelWrapper}>
          <span className={styles.navLabel}>NAVIGATION</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              className={[styles.navItem, activeTab === key ? styles.active : ""].join(" ")}
              onClick={() => handleNavClick(key)}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
