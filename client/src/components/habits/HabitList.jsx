import { useEffect, useState } from "react";
import plusIcon from "../../assets/plus_icon.svg";
import { useHabits } from "../../hooks/useHabits.js";
import useStore from "../../store/useStore.js";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import HabitItem from "./HabitItem.jsx";
import styles from "./HabitList.module.css";
import HorizontalCalendar from "./HorizontalCalendar.jsx";

export default function HabitList() {
  const { habits, selectedDate, setSelectedDate, load, complete, uncomplete, startTimer, progress, deleteProgress } = useHabits();
  const { openHabitForm } = useStore();
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    load(selectedDate, { clearFirst: true }).catch(() => setError("Failed to load habits"));
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async (id) => {
    try {
      return await startTimer(id);
    } catch {
      setError("Could not start timer");
      return null;
    }
  };

  const handleComplete = async (id, value) => {
    try {
      await complete(id, value);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not record completion");
    }
  };

  const handleUncomplete = async (id, value = null) => {
    try {
      await uncomplete(id, value);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not undo completion");
    }
  };

  const handleProgress = async (id, value) => {
    try {
      return await progress(id, value);
    } catch (err) {
      if (err?.response?.status === 429) {
        setError(err?.response?.data?.error || "You are sending requests too frequently. Please slow down.");
      }
    }
  };

  const handleDeleteProgress = async (id) => {
    try {
      await deleteProgress(id);
    } catch {
      setError("Could not clear progress");
    }
  };

  const active = habits.filter((h) => !h.completed_today);
  const done = habits.filter((h) => h.completed_today);

  const habitKey = (h) =>
    `${h.id}-${selectedDate}-${h.completed_today}-${h.progress_value ?? "null"}-${h.completed_value ?? "null"}`;

  return (
    <div className={styles.wrapper}>
      <HorizontalCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className={styles.list}>
        {active.length === 0 && done.length === 0 && (
          <div className={styles.empty}>
            No habits yet. Press <strong>+</strong> to create your first one!
          </div>
        )}

        {active.map((h) => (
          <HabitItem
            key={habitKey(h)}
            habit={h}
            completed={false}
            onStart={handleStart}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onProgress={handleProgress}
            onDeleteProgress={handleDeleteProgress}
            selectedDate={selectedDate}
          />
        ))}

        {done.length > 0 && (
          <>
            <div className={styles.divider}>
              <span>Completed</span>
            </div>
            {done.map((h) => (
              <HabitItem
                key={habitKey(h)}
                habit={h}
                completed={true}
                onStart={handleStart}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onProgress={handleProgress}
                onDeleteProgress={handleDeleteProgress}
                selectedDate={selectedDate}
              />
            ))}
          </>
        )}
      </div>

      <button className={styles.fab} onClick={() => openHabitForm()}>
        <img src={plusIcon} alt="+" />
      </button>
    </div>
  );
}
