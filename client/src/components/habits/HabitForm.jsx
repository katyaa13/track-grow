import { useState } from "react";
import { localDateString, useHabits } from "../../hooks/useHabits.js";
import useStore from "../../store/useStore.js";
import Button from "../ui/Button.jsx";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import Input from "../ui/Input.jsx";
import Modal from "../ui/Modal.jsx";
import styles from "./HabitForm.module.css";

const TRACKING_TYPES = [
  { value: "checkbox", label: "✅ Checkbox", hint: "Track your do's or don'ts" },
  { value: "counter", label: "🔢 Counter", hint: "Count repetitions" },
  { value: "timer", label: "⏱️ Timer", hint: "Track time spent" },
];

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];

const COLORS = ["#D82323", "#FA864C", "#F5C542", "#3EB655", "#38B3E8", "#AD4BE6", "#FA6EC2"];

const EMOJIS = [
  "🌿",
  "🌸",
  "💧",
  "🏋️",
  "🏃",
  "🧘",
  "🧠",
  "📚",
  "✍️",
  "💻",
  "🎨",
  "🛏️",
  "🍎",
  "🥑",
  "💊",
  "🚿",
  "💰",
  "🎉",
  "🎯",
  "⏳",
  "❌",
];

const NAME_MAX = 20;
const COUNTER_MAX = 86400;
const TIMER_HR_MAX = 23;

function secToHMS(sec) {
  const s = Number(sec) || 0;
  return {
    hr: Math.floor(s / 3600),
    min: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}

function parseNonNegativeInt(val) {
  const str = String(val);
  if (str.includes(".") || str.toLowerCase().includes("e")) return null;
  const n = Number(str);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export default function HabitForm({ onClose }) {
  const { selectedDate, habitFormData } = useStore();
  const { create, update, remove } = useHabits();
  const isEdit = !!habitFormData?.id;

  const initHMS =
    habitFormData?.tracking_type === "timer" && habitFormData?.target_value
      ? secToHMS(habitFormData.target_value)
      : { hr: 0, min: 0, sec: 0 };

  const [form, setForm] = useState({
    name: habitFormData?.name ?? "",
    tracking_type: habitFormData?.tracking_type ?? "checkbox",
    frequency: habitFormData?.frequency ?? "daily",
    target_value: "",
    timerHr: initHMS.hr,
    timerMin: initHMS.min,
    timerSec: initHMS.sec,
    emoji: habitFormData?.emoji ?? "🌿",
    color: habitFormData?.color ?? "#3EB655",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetError, setTargetError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setField = (field) => (val) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (["target_value", "timerHr", "timerMin", "timerSec"].includes(field)) {
      setTargetError("");
    }
  };

  const blockInvalidNumKeys = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const validateAndBuildPayload = () => {
    const name = form.name.trim();
    if (!name) return { error: "Habit name is required" };
    if (name.length > NAME_MAX) return { error: `Name must be at most ${NAME_MAX} characters` };

    let targetValue = null;

    if (form.tracking_type === "timer") {
      const hr = parseNonNegativeInt(form.timerHr);
      const min = parseNonNegativeInt(form.timerMin);
      const sec = parseNonNegativeInt(form.timerSec);

      if (hr === null || min === null || sec === null) {
        return { error: "Please enter valid non-negative integers for the target time" };
      }
      if (min > 59 || sec > 59) {
        return { error: "Minutes and seconds must be between 0 and 59" };
      }
      if (hr > TIMER_HR_MAX) {
        return { error: `Hours must be at most ${TIMER_HR_MAX}` };
      }

      const secs = hr * 3600 + min * 60 + sec;
      if (secs <= 0) return { error: "Please set a target time greater than 0" };
      if (secs > 86400) return { error: "Target time cannot exceed 24 hours" };
      targetValue = secs;
    } else if (form.tracking_type === "counter") {
      const raw = form.target_value === "" ? 1 : parseNonNegativeInt(form.target_value);
      if (raw === null || raw <= 0) {
        return { error: "Target count must be a positive whole number" };
      }
      if (raw > COUNTER_MAX) {
        return { error: `Target count cannot exceed ${COUNTER_MAX}` };
      }
      targetValue = raw;
    }

    return {
      payload: {
        name,
        tracking_type: form.tracking_type,
        frequency: form.frequency,
        target_value: targetValue,
        emoji: form.emoji,
        color: form.color,
      },
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setTargetError("");

    const result = validateAndBuildPayload();
    if (result.error) {
      const isTargetError =
        result.error.includes("time") ||
        result.error.includes("count") ||
        result.error.includes("Hours") ||
        result.error.includes("Minutes");
      if (isTargetError) {
        setTargetError(result.error);
      } else {
        setError(result.error);
      }
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const { name, emoji, color } = result.payload;
        await update(habitFormData.id, { name, emoji, color });
      } else {
        const today = localDateString();
        await create({
          ...result.payload,
          created_at: selectedDate > today ? today : selectedDate,
          today,
        });
      }
      onClose();
    } catch {
      setError("Failed to save habit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await remove(habitFormData.id);
      onClose();
    } catch {
      setError("Failed to delete habit. Please try again.");
      setConfirmDelete(false);
    }
  };

  return (
    <Modal isOpen title={isEdit ? "Edit habit" : "New habit"} onClose={onClose} width={480}>
      <form className={styles.form} onSubmit={submit} noValidate>
        {!isEdit && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>How do you want to track this habit?</p>
            <div className={styles.typeRow}>
              {TRACKING_TYPES.map(({ value, label, hint }) => (
                <button
                  type="button"
                  key={value}
                  className={`${styles.typeBtn} ${form.tracking_type === value ? styles.typeActive : ""}`}
                  onClick={() => setField("tracking_type")(value)}
                >
                  <span className={styles.typeBtnLabel}>{label}</span>
                  <span className={styles.typeBtnHint}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          id="habit-name"
          label="Habit name"
          placeholder="e.g. Drink water"
          value={form.name}
          onChange={(e) => setField("name")(e.target.value)}
          maxLength={NAME_MAX}
          autoFocus={!isEdit}
          autoComplete="off"
        />

        {!isEdit && form.tracking_type === "timer" && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Target time</p>
            <div className={styles.timerRow}>
              <input
                id="timer-hr"
                className={styles.timerField}
                type="number"
                min={0}
                max={TIMER_HR_MAX}
                placeholder="0"
                value={form.timerHr === 0 ? "" : form.timerHr}
                onChange={(e) => setField("timerHr")(e.target.value)}
                onKeyDown={blockInvalidNumKeys}
              />
              <label htmlFor="timer-hr" className={styles.timerUnit}>
                hr
              </label>
              <input
                id="timer-min"
                className={styles.timerField}
                type="number"
                min={0}
                max={59}
                placeholder="0"
                value={form.timerMin === 0 ? "" : form.timerMin}
                onChange={(e) => setField("timerMin")(e.target.value)}
                onKeyDown={blockInvalidNumKeys}
              />
              <label htmlFor="timer-min" className={styles.timerUnit}>
                min
              </label>
              <input
                id="timer-sec"
                className={styles.timerField}
                type="number"
                min={0}
                max={59}
                placeholder="0"
                value={form.timerSec === 0 ? "" : form.timerSec}
                onChange={(e) => setField("timerSec")(e.target.value)}
                onKeyDown={blockInvalidNumKeys}
              />
              <label htmlFor="timer-sec" className={styles.timerUnit}>
                sec
              </label>
            </div>
            {targetError && <ErrorMessage>{targetError}</ErrorMessage>}
          </div>
        )}

        {!isEdit && form.tracking_type === "counter" && (
          <div className={styles.section}>
            <Input
              id="target-value"
              label="Target count"
              type="number"
              min={1}
              max={COUNTER_MAX}
              placeholder="1"
              value={form.target_value}
              onChange={(e) => setField("target_value")(e.target.value)}
              onKeyDown={blockInvalidNumKeys}
            />
            {targetError && <ErrorMessage>{targetError}</ErrorMessage>}
          </div>
        )}

        {!isEdit && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Period</p>
            <div className={styles.pillRow}>
              {FREQUENCIES.map((f) => (
                <button
                  type="button"
                  key={f}
                  className={`${styles.pill} ${form.frequency === f ? styles.pillActive : ""}`}
                  onClick={() => setField("frequency")(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Emoji</p>
          <div className={styles.emojiGrid}>
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                className={`${styles.emojiBtn} ${form.emoji === em ? styles.emojiActive : ""}`}
                onClick={() => setField("emoji")(em)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Color</p>
          <div className={styles.colorGrid}>
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`${styles.colorSwatch} ${form.color === c ? styles.colorActive : ""}`}
                style={{ background: c }}
                onClick={() => setField("color")(c)}
              />
            ))}
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <div className={styles.actions}>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create habit"}
          </Button>
          {isEdit && (
            <Button type="button" variant={confirmDelete ? "danger" : "secondary"} onClick={handleDelete}>
              {confirmDelete ? "Tap again to confirm" : "Delete habit"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
