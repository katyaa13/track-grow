import { useEffect, useRef, useState } from "react";
import lockIcon from "../../assets/lock_icon.svg";
import markDoneImg from "../../assets/mark_done.svg";
import styles from "./CompletionControls.module.css";

const CancelIcon = () => (
  <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.2831 0.289969C10.6736 -0.100502 11.3125 -0.0945382 11.7031 0.295828C12.0936 0.686352 12.0994 1.32523 11.7089 1.71575L7.42473 5.99895L11.7089 10.2831C12.0994 10.6737 12.0936 11.3125 11.7031 11.7031C11.3125 12.0994 10.6737 12.0994 10.2831 11.7089L5.99895 7.42473L1.71575 11.7089C1.32523 12.0994 0.686352 12.0936 0.295828 11.7031C-0.0945382 11.3125 -0.100502 10.6736 0.289969 10.2831L4.57317 5.99895L0.289969 1.71575C-0.100533 1.32522 -0.0946888 0.686345 0.295828 0.295828C0.686345 -0.0946888 1.32522 -0.100533 1.71575 0.289969L5.99895 4.57317L10.2831 0.289969Z"
      fill="currentColor"
    />
  </svg>
);

const PlayIcon = () => (
  <svg width={18} height={18} viewBox="0 0 14 16" fill="none" style={{ paddingLeft: "4px", display: "block" }}>
    <path d="M13.5 7.79419L0 15.5884L0 0L13.5 7.79419Z" fill="currentColor" />
  </svg>
);

const PauseIcon = () => (
  <svg width={11} height={14} viewBox="0 0 11 14" fill="none" style={{ display: "block" }}>
    <rect x="0" y="0" width="4.47" height="14" rx="1" fill="currentColor" />
    <rect x="6.42" y="0" width="4.47" height="14" rx="1" fill="currentColor" />
  </svg>
);

// COUNTER STATE

export function useCounterState(habit, completed, progressValue, onComplete, onUncomplete, onProgress) {
  const target = habit.target_value || 1;
  const initCount = progressValue != null ? Number(progressValue) : completed ? target : 0;
  const [count, setCount] = useState(initCount);
  const firedRef = useRef(completed);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; });

  useEffect(() => {
    const next = progressValue != null ? Number(progressValue) : completed ? target : 0;
    setCount(next);
    firedRef.current = completed;
  }, [progressValue, completed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const scheduleSave = (value) => {
    pendingRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const val = pendingRef.current;
      debounceRef.current = null;
      pendingRef.current = null;
      try {
        const res = await onProgressRef.current(val);
        const serverValue = res?.data?.data?.value;
        if (serverValue !== undefined) setCount(serverValue);
      } catch (_) {}
    }, 500);
  };

  const flushPending = () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    pendingRef.current = null;
  };

  const inc = () => {
    const next = count + 1;
    setCount(next);
    if (next < target) {
      scheduleSave(next);
    } else {
      flushPending();
      if (!firedRef.current) firedRef.current = true;
      onComplete(next);
    }
  };

  const dec = () => {
    if (count <= 0) return;
    const next = count - 1;
    setCount(next);
    if (next < target && firedRef.current) {
      flushPending();
      firedRef.current = false;
      onUncomplete(next);
    } else {
      scheduleSave(next);
    }
  };

  return { count, target, inc, dec };
}

// TIMER STATE

const TIMER_MAX_SEC = 86400;

export function useTimerState(habit, selectedDate, completed, completedValue, progressValue, timerStartedAt, onStart, onComplete, onProgress) {
  const targetSec = habit.target_value || 1800;

  // Accumulated seconds before the current run
  const storedProgressRef = useRef(
    progressValue != null ? Number(progressValue) : completed ? Number(completedValue ?? 0) : 0
  );
  const timerStartedAtMsRef = useRef(
    timerStartedAt ? new Date(timerStartedAt).getTime() : null
  );

  const getElapsed = () => {
    const base = timerStartedAtMsRef.current;
    return base != null
      ? Math.round(storedProgressRef.current + (Date.now() - base) / 1000)
      : storedProgressRef.current;
  };

  const initRunning = timerStartedAt != null;
  const [elapsed, setElapsed] = useState(() => Math.min(getElapsed(), TIMER_MAX_SEC));
  const [running, setRunning] = useState(initRunning);
  const runningRef = useRef(initRunning);
  const completedRef = useRef(completed);
  completedRef.current = completed;

  useEffect(() => {
    if (runningRef.current) return;
    const stored = progressValue != null ? Number(progressValue) : completed ? Number(completedValue ?? 0) : 0;
    storedProgressRef.current = stored;
    const ts = timerStartedAt ? new Date(timerStartedAt).getTime() : null;
    timerStartedAtMsRef.current = ts;
    const e = ts != null ? Math.round(stored + (Date.now() - ts) / 1000) : stored;
    setElapsed(e);
    if (ts != null) {
      runningRef.current = true;
      setRunning(true);
    }
  }, [progressValue, completedValue, timerStartedAt, completed]);  

  // 1-second tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!runningRef.current) return;
      const e = Math.min(getElapsed(), TIMER_MAX_SEC);
      setElapsed(e);
      if (e >= TIMER_MAX_SEC) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && timerStartedAtMsRef.current != null) {
        setElapsed(Math.min(getElapsed(), TIMER_MAX_SEC));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const handleToggle = async () => {
    if (running) {
      const snapped = Math.min(getElapsed(), TIMER_MAX_SEC);
      runningRef.current = false;
      timerStartedAtMsRef.current = null;
      setRunning(false);
      setElapsed(snapped);
      if (snapped < targetSec) {
        await onProgress?.(snapped);
      } else {
        onComplete?.(snapped);
      }
    } else {
      const result = await onStart?.();
      if (!result) return;
      const { progress_value } = result;
      storedProgressRef.current = progress_value != null ? Number(progress_value) : 0;
      timerStartedAtMsRef.current = Date.now();
      runningRef.current = true;
      setElapsed(storedProgressRef.current);
      setRunning(true);
    }
  };

  return { elapsed, running, fmt, handleToggle };
}

// UI COMPONENTS

export function LeftIndicator({ habit, completed, isLocked, onComplete, onUncomplete, timerState, counterState }) {
  if (isLocked) {
    return (
      <div className={[styles.circleBtn, styles.circleLocked].join(" ")}>
        <img src={lockIcon} alt="Locked" width={14} height={18} />
      </div>
    );
  }

  if (habit.tracking_type === "timer") {
    const { running, handleToggle } = timerState;
    return (
      <button className={styles.circleBtn} onClick={handleToggle}>
        {running ? <PauseIcon /> : <PlayIcon />}
      </button>
    );
  }

  if (habit.tracking_type === "counter") {
    const { count } = counterState;
    return (
      <div className={[styles.circleBtn, styles.circleStat].join(" ")}>
        <span className={styles.circleVal}>{count}</span>
      </div>
    );
  }

  // checkbox
  return (
    <button
      className={[styles.circleBtn, completed ? styles.circleDone : ""].join(" ")}
      onClick={completed ? onUncomplete : onComplete}
    >
      {completed && <img src={markDoneImg} alt="Done" width={18} height={18} />}
    </button>
  );
}

export function RightControls({ habit, timerState, counterState, onDeleteProgress }) {
  if (habit.tracking_type === "timer") {
    const { elapsed, running, fmt } = timerState;

    return (
      <div className={styles.timerWrap}>
        {elapsed > 0 && !running && (
          <button className={styles.counterBtn} onClick={onDeleteProgress}>
            <CancelIcon />
          </button>
        )}
        <span className={styles.timerVal}>{fmt(elapsed)}</span>
      </div>
    );
  }

  if (habit.tracking_type === "counter") {
    const { count, target, inc, dec } = counterState;
    return (
      <div className={styles.counterBtns}>
        <button className={styles.counterBtn} onClick={dec} disabled={count === 0}>
          −
        </button>
        <span className={styles.counterFrac}>
          {count}/{target}
        </span>
        <button className={styles.counterBtn} onClick={inc}>
          +
        </button>
      </div>
    );
  }

  return null;
}

export default function CompletionControls({
  habit,
  selectedDate,
  completed,
  completedValue,
  progressValue,
  timerStartedAt,
  onStart,
  onComplete,
  onUncomplete,
  onProgress,
  onDeleteProgress,
}) {
  const counterState = useCounterState(habit, completed, progressValue, onComplete, onUncomplete, onProgress);
  const timerState = useTimerState(
    habit,
    selectedDate,
    completed,
    completedValue,
    progressValue,
    timerStartedAt,
    onStart,
    onComplete,
    onProgress,
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <LeftIndicator
        habit={habit}
        completed={completed}
        onComplete={onComplete}
        onUncomplete={onUncomplete}
        timerState={timerState}
        counterState={counterState}
      />
      <RightControls
        habit={habit}
        timerState={timerState}
        counterState={counterState}
        onDeleteProgress={onDeleteProgress}
      />
    </div>
  );
}
