import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { login as loginService } from "../services/authService";
import "./Landing.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

const Landing = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const resetForm = () => setForm({ name: "", email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        const data = await loginService(form.email, form.password);
        login(data.user);
        navigate(data.user.role === "admin" ? "/admin" : "/student");
        return;
      }

      const res = await axios.post(`${API_URL}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      alert(res.data.message || "Registered successfully!");
      setForm({ name: "", email: "", password: "" });
      setMode("login");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          (mode === "login" ? "Invalid credentials" : "Registration failed")
      );
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="landing">
      <div className="landing-panel">
        <div className="landing-toggle">
          <button
            type="button"
            className={`landing-toggle-btn ${isLogin ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              resetForm();
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`landing-toggle-btn ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              resetForm();
            }}
          >
            Register
          </button>
          <div className={`landing-toggle-indicator ${isLogin ? "left" : "right"}`} />
        </div>

        <form onSubmit={handleSubmit} className="landing-card">
          <h2 className="landing-title">{isLogin ? "Login" : "Register"}</h2>

          <div className={`landing-name-row ${isLogin ? "hidden" : ""}`}>
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={onChange("name")}
              required={!isLogin}
              className="landing-field"
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange("email")}
            required
            className="landing-field"
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange("password")}
            required
            className="landing-field"
          />

          <button type="submit" className="landing-submit">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Landing;