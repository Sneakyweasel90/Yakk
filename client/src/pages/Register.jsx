import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post("http://localhost:4000/api/auth/register", {
        username,
        password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.logo}>🦆 Yakk</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit">Create Account</button>
        </form>
        <p style={styles.link}>Have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#1a1a2e" },
  box: { background: "#16213e", padding: "2rem", borderRadius: "12px", width: "320px", textAlign: "center" },
  logo: { color: "#e94560", marginBottom: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "0.75rem", borderRadius: "8px", border: "1px solid #0f3460", background: "#0f3460", color: "#fff", fontSize: "1rem" },
  button: { padding: "0.75rem", borderRadius: "8px", background: "#e94560", color: "#fff", border: "none", fontSize: "1rem", cursor: "pointer" },
  error: { color: "#e94560", fontSize: "0.85rem" },
  link: { color: "#aaa", marginTop: "1rem", fontSize: "0.9rem" },
};