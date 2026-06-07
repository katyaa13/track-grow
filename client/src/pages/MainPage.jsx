import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import cancelIcon from "../assets/cancel_icon.svg";
import menuIcon from "../assets/menu_icon.svg";
import AchievementGrid from "../components/achievements/AchievementGrid.jsx";
import AchievementUnlockedModal from "../components/achievements/AchievementUnlockedModal.jsx";
import GardenGrid from "../components/garden/GardenGrid.jsx";
import HabitForm from "../components/habits/HabitForm.jsx";
import HabitList from "../components/habits/HabitList.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import ProfileModal from "../components/profile/ProfileModal.jsx";
import StatsOverview from "../components/statistics/StatsOverview.jsx";
import { useAuth } from "../hooks/useAuth.js";
import useStore from "../store/useStore.js";
import styles from "./MainPage.module.css";

const TAB_TITLES = {
  habits: "Habits",
  garden: "My Habit Garden",
  statistics: "Statistics",
  achievements: "My Achievements",
};

export default function MainPage() {
  useAuth();
  
  const location = useLocation();
  const activeTab = location.pathname.slice(1) || "habits";

  const {
    profileModalOpen,
    setProfileModalOpen,
    habitFormOpen,
    closeHabitForm,
    pendingAchievements,
    clearPendingAchievements,
  } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{TAB_TITLES[activeTab]}</h1>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)}>
            <img src={sidebarOpen ? cancelIcon : menuIcon} alt="" />
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === "habits" && <HabitList />}
          {activeTab === "garden" && <GardenGrid />}
          {activeTab === "statistics" && <StatsOverview />}
          {activeTab === "achievements" && <AchievementGrid />}
        </div>
      </main>

      {profileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}
      {habitFormOpen && <HabitForm onClose={closeHabitForm} />}
      {pendingAchievements.length > 0 && (
        <AchievementUnlockedModal achievements={pendingAchievements} onClose={clearPendingAchievements} />
      )}
    </div>
  );
}
