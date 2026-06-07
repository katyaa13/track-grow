import { create } from "zustand";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const useStore = create((set) => ({
  // Auth
  user: null,
  token: localStorage.getItem("tg_token") || null,

  setUser: (user) => set({ user }),
  patchUser: (patch) => set((s) => ({
    user: s.user ? { ...s.user, ...patch } : s.user,
  })),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("tg_token", token);
    } else {
      localStorage.removeItem("tg_token");
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("tg_token");
    set({
      user: null,
      token: null,

      habits: [],
      garden: [],
      achievements: [],
      pendingAchievements: [],

      profileModalOpen: false,
      habitFormOpen: false,
      habitFormData: null,

      activeTab: "habits",
    });
  },

  // Habits
  habits: [],
  selectedDate: todayString(),

  setHabits: (habits) => set({ habits }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  addHabit: (habit) => set((s) => ({ habits: [...s.habits, habit] })),
  removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

  // Garden
  garden: [],
  setGarden: (garden) => set({ garden }),
  updatePlant: (updated) => set((s) => ({ garden: s.garden.map((p) => (p.id === updated.id ? updated : p)) })),

  // Statistics
  statistics: null,
  setStatistics: (statistics) => set({ statistics }),
  patchStatistics: (patch) =>
    set((s) => ({ statistics: s.statistics ? { ...s.statistics, ...patch } : patch })),

  // Achievements
  achievements: [],
  setAchievements: (achievements) => set({ achievements }),

  pendingAchievements: [],
  setPendingAchievements: (list) => set({ pendingAchievements: list }),
  clearPendingAchievements: () => set({ pendingAchievements: [] }),

  // UI State
  profileModalOpen: false,
  setProfileModalOpen: (open) => set({ profileModalOpen: open }),

  habitFormOpen: false,
  habitFormData: null,
  openHabitForm: (data = null) => set({ habitFormOpen: true, habitFormData: data }),
  closeHabitForm: () => set({ habitFormOpen: false, habitFormData: null }),
}));

export default useStore;
