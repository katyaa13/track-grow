export default function ErrorMessage({ children }) {
  if (!children) return null;
  return (
    <p
      style={{
        color: "var(--color-error)",
        fontSize: "12px",
        background: "var(--color-error-bg)",
        padding: "8px 12px",
        borderRadius: "var(--radius-xs)",
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        textAlign: "left",
      }}
    >
      {children}
    </p>
  );
}
