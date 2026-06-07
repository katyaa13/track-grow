import styles from "./Button.module.css";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  className = "",
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[styles.btn, styles[variant], styles[size], className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}
