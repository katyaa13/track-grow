import { useState } from "react";
import shelfImg from "../assets/shelf.svg";
import Button from "../components/ui/Button.jsx";
import ErrorMessage from "../components/ui/ErrorMessage.jsx";
import Input from "../components/ui/Input.jsx";
import { useAuth } from "../hooks/useAuth.js";
import styles from "./WelcomePage.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_HINT = "At least 8 characters, including a letter and a number.";

function validate(mode, form) {
  if (mode === "signup") {
    if (!form.name.trim()) return "Username is required.";
    if (form.name.trim().length < 2) return "Username must be at least 2 characters.";
    if (form.name.trim().length > 16) return "Username must be at most 16 characters.";
  }
  if (!form.email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(form.email)) return "Please enter a valid email address.";
  if (!form.password) return "Password is required.";
  if (mode === "signup") {
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-zA-Z]/.test(form.password)) return "Password must include at least one letter.";
    if (!/[0-9]/.test(form.password)) return "Password must include at least one number.";
  }
  return null;
}

export default function WelcomePage() {
  const { register, login } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const switchMode = () => {
    setMode((m) => (m === "signup" ? "signin" : "signup"));
    setError("");
    setForm({ name: "", email: "", password: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validate(mode, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await register(form);
      } else {
        await login(form);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftWrapper}>
          <div className={styles.textWrapper}>
            <div className={styles.brand}>🌱 Track&amp;Grow</div>
            <h1 className={styles.headline}>Create your garden of habits and watch it grow</h1>
            <ul className={styles.features}>
              <li>✔ Create habits</li>
              <li>✔ Track progress</li>
              <li>✔ Achieve goals</li>
            </ul>
          </div>
          <div className={styles.shelfWrapper}>
            <img src={shelfImg} alt="plants on shelf" className={styles.shelfImg} />
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <form className={styles.form} onSubmit={submit} key={mode} autoComplete="on" noValidate>
          <h2 className={styles.formTitle}>{isSignup ? "Create an account" : "Welcome back"}</h2>

          {isSignup && (
            <Input
              id="reg-username"
              label="Username"
              name="username"
              autoComplete="off"
              placeholder="Your display name"
              value={form.name}
              onChange={handle("name")}
              maxLength={16}
              autoFocus
            />
          )}

          <Input
            id={isSignup ? "reg-email" : "login-email"}
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={form.email}
            onChange={handle("email")}
            maxLength={254}
            autoFocus={!isSignup}
          />

          <Input
            id={isSignup ? "reg-password" : "login-password"}
            label="Password"
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={form.password}
            onChange={handle("password")}
            maxLength={128}
            hint={isSignup ? PASSWORD_HINT : undefined}
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button type="submit" disabled={loading}>
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </Button>

          <button type="button" className={styles.switchLink} onClick={switchMode}>
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
