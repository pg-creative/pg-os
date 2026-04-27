export default function UnlockPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: 'var(--body, system-ui, "Inter", sans-serif)',
        color: "var(--fg, #1a2433)",
        background: "var(--bg-0, #E8F0F7)",
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--serif, "Playfair Display", serif)',
          fontSize: "32px",
          fontWeight: 500,
          marginBottom: "12px",
        }}
      >
        PG OS
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono, "JetBrains Mono", monospace)',
          fontSize: "10.5px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted, #5E6F82)",
          marginBottom: "24px",
        }}
      >
        // locked //
      </p>
      <p style={{ maxWidth: 380, lineHeight: 1.6 }}>
        This instance is single-user. Append <code>?key=YOUR_SECRET</code> to any URL on this domain to unlock for 90 days on this device.
      </p>
    </main>
  );
}
