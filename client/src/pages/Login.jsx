import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import config from "../config";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
          const { data } = await axios.post(`${config.HTTP}/api/auth/login`, {        username,
        password,
      });
      login(data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid} />
      <div style={styles.glow} />
      <div style={styles.box}>
        <div style={styles.scanline} />
        <div style={styles.logoWrap}>
          <h1 style={styles.logo}>YAKK</h1>
          <div style={styles.logoSub}>SECURE CHANNEL ACCESS</div>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>IDENTIFIER</label>
            <input
              style={styles.input}
              placeholder="enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>PASSKEY</label>
            <input
              style={styles.input}
              type="password"
              placeholder="enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p style={styles.error}>⚠ {error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "CONNECTING..." : "JACK IN"}
          </button>
        </form>
        <p style={styles.link}>
          No account?{" "}
          <Link to="/register" style={styles.linkA}>REGISTER</Link>
        </p>
      </div>
      <style>{`
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.8; }
          98% { opacity: 0.9; }
        }
        @keyframes scanMove {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        input::placeholder { color: #1a4a3a; }
        input:focus { outline: none; border-color: #00ff9f !important; box-shadow: 0 0 20px rgba(0,255,159,0.3) !important; }
        button:hover { background: #00ff9f !important; color: #000 !important; box-shadow: 0 0 30px rgba(0,255,159,0.6) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh", background: "#020a06", position: "relative", overflow: "hidden",
    fontFamily: "'Rajdhani', sans-serif",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: `linear-gradient(rgba(0,255,159,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,159,0.05) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
  },
  glow: {
    position: "absolute", width: "600px", height: "600px",
    background: "radial-gradient(circle, rgba(0,255,159,0.08) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  box: {
    position: "relative", background: "rgba(0,15,10,0.9)",
    border: "1px solid rgba(0,255,159,0.3)", borderRadius: "4px",
    padding: "2.5rem", width: "360px", overflow: "hidden",
    boxShadow: "0 0 40px rgba(0,255,159,0.1), inset 0 0 40px rgba(0,0,0,0.5)",
    animation: "flicker 8s infinite",
  },
  scanline: {
    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(0,255,159,0.4), transparent)",
    animation: "scanMove 4s linear infinite", pointerEvents: "none",
  },
  logoWrap: { textAlign: "center", marginBottom: "2rem" },
  logo: {
    fontFamily: "'Orbitron', monospace", fontSize: "2.5rem",
    fontWeight: 900, color: "#00ff9f", margin: 0, letterSpacing: "0.3em",
    textShadow: "0 0 20px rgba(0,255,159,0.8), 0 0 40px rgba(0,255,159,0.4)",
  },
  logoSub: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem",
    color: "rgba(0,255,159,0.5)", letterSpacing: "0.2em", marginTop: "0.25rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  fieldWrap: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem",
    color: "rgba(0,255,159,0.6)", letterSpacing: "0.15em",
  },
  input: {
    padding: "0.75rem 1rem", background: "rgba(0,255,159,0.03)",
    border: "1px solid rgba(0,255,159,0.2)", borderRadius: "2px",
    color: "#00ff9f", fontSize: "0.95rem", fontFamily: "'Share Tech Mono', monospace",
    transition: "all 0.2s",
  },
  button: {
    padding: "0.85rem", background: "transparent",
    border: "1px solid #00ff9f", borderRadius: "2px",
    color: "#00ff9f", fontSize: "0.9rem", cursor: "pointer",
    fontFamily: "'Orbitron', monospace", fontWeight: 700,
    letterSpacing: "0.15em", transition: "all 0.2s",
    marginTop: "0.5rem",
  },
  error: {
    color: "#ff3366", fontSize: "0.8rem",
    fontFamily: "'Share Tech Mono', monospace", margin: 0,
  },
  link: { textAlign: "center", color: "rgba(0,255,159,0.4)", fontSize: "0.8rem", marginTop: "1.5rem", marginBottom: 0 },
  linkA: { color: "#00ff9f", textDecoration: "none", fontFamily: "'Share Tech Mono', monospace" },
};