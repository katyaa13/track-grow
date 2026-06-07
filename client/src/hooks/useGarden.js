import { useCallback } from "react";
import { restorePlant as apiRestore, getGarden } from "../api/garden.api.js";
import useStore from "../store/useStore.js";

export function useGarden() {
  const { garden, setGarden, patchUser, setPendingAchievements } = useStore();

  const load = useCallback(async () => {
    const res = await getGarden();
    setGarden(res.data.data);
  }, [setGarden]);

  const restore = useCallback(
    async (plantId) => {
      const res = await apiRestore(plantId);
      const { drops_balance, total_xp, newly_unlocked } = res.data.data;
      patchUser({ drops_balance, ...(total_xp !== undefined && { total_xp }) });
      if (newly_unlocked?.length) setPendingAchievements(newly_unlocked);
      await load();
    },
    [load, patchUser, setPendingAchievements],
  );

  return { garden, load, restore };
}
