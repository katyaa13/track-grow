import { useCallback } from "react";
import { getCalendar as apiGetCalendar, getStatistics as apiGetStatistics } from "../api/statistics.api.js";
import useStore from "../store/useStore.js";

export function useStatistics() {
  const { statistics, patchStatistics } = useStore();

  const loadStats = useCallback(
    async (habitId = null) => {
      const res = await apiGetStatistics(habitId);
      patchStatistics(res.data.data);
    },
    [patchStatistics],
  );

  const loadCalendar = useCallback(
    async (habitId = null, month = null) => {
      const res = await apiGetCalendar(habitId, month);
      patchStatistics(res.data.data);
    },
    [patchStatistics],
  );

  return { statistics, loadStats, loadCalendar };
}
