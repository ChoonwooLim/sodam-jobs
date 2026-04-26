import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const resetForm = () => { setUsername(""); setEmail(""); setPassword(""); setRole("user"); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { username, password }
        : { username, email, password, role };
      const { data } = await api.post(endpoint, body);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "admin" || data.user.role === "superadmin" ? "/admin" : "/");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(mode === "login" ? msg || "로그인에 실패했습니다." : msg || "회원가입에 실패했습니다.");
    } finally { setLoading(false); }
  };

  const isLogin = mode === "login";

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <div className={styles.brandLogo}>Sodam<span className={styles.brandAccent}>Jobs</span></div>
        <p className={styles.brandTagline}>동네 단기 알바 직거래 — 사장님과 알바생을 가장 빠르게 연결합니다.</p>
        <hr className={styles.brandRule} />
        <span className={styles.brandFootnote}>Authenticated Access</span>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <div className={styles.tabRow}>
            <button className={`${styles.tab} ${isLogin ? styles.tabActive : ""}`} onClick={() => { setMode("login"); resetForm(); }} type="button">Sign in</button>
            <button className={`${styles.tab} ${!isLogin ? styles.tabActive : ""}`} onClick={() => { setMode("register"); resetForm(); }} type="button">Register</button>
          </div>
          <p className={styles.formSubheading}>{isLogin ? "Enter your credentials to continue." : "Create a new account."}</p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input className={`${styles.input} ${username ? styles.inputFilled : ""}`} type="text" id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              <label className={styles.label} htmlFor="login-username">Username</label>
            </div>
            {!isLogin && (
              <div className={styles.inputGroup}>
                <input className={`${styles.input} ${email ? styles.inputFilled : ""}`} type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <label className={styles.label} htmlFor="login-email">Email</label>
              </div>
            )}
            {!isLogin && (
              <div className={styles.roleRow}>
                <span className={styles.roleLabel}>역할</span>
                <label className={styles.roleOption}>
                  <input type="radio" name="role" value="user" checked={role === "user"} onChange={(e) => setRole(e.target.value)} />
                  알바생
                </label>
                <label className={styles.roleOption}>
                  <input type="radio" name="role" value="employer" checked={role === "employer"} onChange={(e) => setRole(e.target.value)} />
                  사장님
                </label>
              </div>
            )}
            <div className={styles.inputGroup}>
              <input className={`${styles.input} ${password ? styles.inputFilled : ""}`} type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} />
              <label className={styles.label} htmlFor="login-password">Password</label>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submit} type="submit" disabled={loading}>{loading ? "..." : isLogin ? "Sign in" : "Create account"}</button>
          </form>
          <Link to="/" className={styles.backLink}><span className={styles.backLinkArrow}>&larr;</span> Back to home</Link>
        </div>
      </div>
    </div>
  );
}
