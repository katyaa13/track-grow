import { useCallback, useRef } from "react";
import {
  completeHabit as apiComplete,
  startTimer as apiStartTimer,
  uncompleteHabit as apiUncomplete,
  createHabit,
  deleteHabit,
  deleteProgress as deleteProgressApi,
  getHabits,
  updateHabit,
  updateProgress,
} from "../api/habits.api.js";
import useStore from "../store/useStore.js";

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Only the response whose seq matches the latest call may commit to the store
let loadSeq = 0;

export function useHabits() {
  const { habits, setHabits, addHabit, removeHabit, selectedDate, setSelectedDate, patchUser, setPendingAchievements } =
    useStore();

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const load = useCallback(
    async (date, { clearFirst = false } = {}) => {
      const d = date ?? selectedDateRef.current;
      const seq = ++loadSeq;
      if (clearFirst) setHabits([]);
      const res = await getHabits(d);
      if (seq !== loadSeq) return; // stale response - discard
      setHabits(res.data.data);
    },
    [setHabits],
  );

  const create = useCallback(
    async (data) => {
      const res = await createHabit(data);
      addHabit(res.data.data);
      if (res.data.total_xp !== undefined) {
        patchUser({ total_xp: res.data.total_xp });
      }
      if (res.data.newly_unlocked?.length) setPendingAchievements(res.data.newly_unlocked);
      return res.data.data;
    },
    [addHabit, patchUser, setPendingAchievements],
  );

  const update = useCallback(
    async (id, data) => {
      const res = await updateHabit(id, data);
      await load(selectedDateRef.current);
      return res.data.data;
    },
    [load],
  );

  const remove = useCallback(
    async (id) => {
      const res = await deleteHabit(id);
      removeHabit(id);
      if (res.data.total_xp !== undefined) {
        patchUser({ total_xp: res.data.total_xp });
      }
    },
    [removeHabit, patchUser],
  );

  const complete = useCallback(
    async (habitId, value = null) => {
      const dateAtCall = selectedDateRef.current;
      const res = await apiComplete(habitId, value, dateAtCall, localDateString());
      const { drops_balance, total_xp, newly_unlocked } = res.data.data;
      patchUser({ drops_balance, ...(total_xp !== undefined && { total_xp }) });
      if (newly_unlocked?.length) setPendingAchievements(newly_unlocked);
      await load(dateAtCall);
      return res.data.data;
    },
    [load, patchUser, setPendingAchievements],
  );

  const uncomplete = useCallback(
    async (habitId, value = null) => {
      const dateAtCall = selectedDateRef.current;
      const res = await apiUncomplete(habitId, dateAtCall, value, localDateString());
      const { drops_balance, total_xp } = res.data.data;
      patchUser({ drops_balance, ...(total_xp !== undefined && { total_xp }) });
      await load(dateAtCall);
      return res.data.data;
    },
    [load, patchUser],
  );

  const startTimer = useCallback(async (habitId) => {
    const res = await apiStartTimer(habitId, { date: selectedDateRef.current });
    return res.data.data;
  }, []);

  const progress = useCallback((habitId, value) => {
    return updateProgress(habitId, { value, date: selectedDateRef.current });
  }, []);

  const deleteProgress = useCallback(
    async (habitId) => {
      const dateAtCall = selectedDateRef.current;
      await deleteProgressApi(habitId, dateAtCall);
      await load(dateAtCall);
    },
    [load],
  );

  return {
    habits,
    selectedDate,
    setSelectedDate,
    load,
    create,
    update,
    remove,
    complete,
    uncomplete,
    startTimer,
    progress,
    deleteProgress,
  };
}
