import { useCallback } from "react";
import { getAchievements } from "../api/achievements.api.js";
import useStore from "../store/useStore.js";

export function useAchievements() {
  const { achievements, setAchievements } = useStore();

  const load = useCallback(async () => {
    const res = await getAchievements();
    setAchievements(res.data.data);
  }, [setAchievements]);

  return { achievements, load };
}
