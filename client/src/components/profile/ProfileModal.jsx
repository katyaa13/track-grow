import { useEffect, useRef, useState } from "react";
import { updateMe } from "../../api/users.api.js";
import { useAuth } from "../../hooks/useAuth.js";
import useStore from "../../store/useStore.js";
import Button from "../ui/Button.jsx";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import Input from "../ui/Input.jsx";
import Modal from "../ui/Modal.jsx";
import styles from "./ProfileModal.module.css";

const USERNAME_MIN = 2;
const USERNAME_MAX = 16;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function validate(form) {
  const u = form.username.trim();
  if (!u) return "Username is required.";
  if (u.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters.`;
  if (u.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters.`;
  return null;
}

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth();
  const { setUser } = useStore();
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    username: user?.username ?? "",
    avatar_data: user?.avatar_data ?? "",
  });
  const [preview, setPreview] = useState(user?.avatar_data ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, and WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setError("Image must be smaller than 2MB.");
      e.target.value = "";
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setPreview(b64);
      setForm((f) => ({ ...f, avatar_data: b64 }));
    };
    reader.onerror = () => setError("Failed to read the image file.");
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await updateMe({
        username: form.username.trim(),
        ...(form.avatar_data !== (user?.avatar_data ?? "") && {
          avatar_data: form.avatar_data,
        }),
      });
      setUser(res.data.data);
      setSuccess(true);
      timerRef.current = setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    logout();
  };

  const avatarLetter = (form.username || user?.username || "U")[0].toUpperCase();

  return (
    <Modal isOpen title="Profile Settings" onClose={onClose} width={440}>
      <form className={styles.form} onSubmit={submit} noValidate autoComplete="off">
        <div className={styles.avatarSection}>
          <button type="button" className={styles.avatarPreview} onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="Profile avatar" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{avatarLetter}</div>
            )}
            <div className={styles.avatarOverlay}>📷</div>
          </button>

          <input
            ref={fileRef}
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
          <span className={styles.avatarHint}>Click to upload photo (JPEG, PNG, GIF, WebP · max 2MB)</span>
        </div>

        <Input
          id="profile-username"
          label="Username"
          placeholder="Your display name"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          maxLength={USERNAME_MAX}
          autoComplete="off"
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <p className={styles.successMsg}>Changes saved!</p>}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Sign out
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
