import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await axios.post("http://localhost:4000/api/auth/login", {
        username,
        password,
      });
      login(data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.logo}>Yakk</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit">Login</button>
        </form>
        <p style={styles.link}>No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#1a1a2e" },
  box: { background: "#284eb4", padding: "2rem", borderRadius: "12px", width: "320px", textAlign: "center" },
  logo: { color: "#e94560", marginBottom: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "0.75rem", borderRadius: "8px", border: "1px solid #0f3460", background: "#0f3460", color: "#fff", fontSize: "1rem" },
  button: { padding: "0.75rem", borderRadius: "8px", background: "#e94560", color: "#fff", border: "none", fontSize: "1rem", cursor: "pointer" },
  error: { color: "#e94560", fontSize: "0.85rem" },
  link: { color: "#aaa", marginTop: "1rem", fontSize: "0.9rem" },
};