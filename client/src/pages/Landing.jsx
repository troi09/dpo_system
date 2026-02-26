import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { login as loginService } from "../services/authService";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

const formStyle = {
  padding: "30px",
  borderRadius: "8px",
  width: "320px",
  textAlign: "center",
};

const inputStyle = { width: "100%", padding: "10px", margin: "10px 0" };

const Landing = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

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

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
        <button type="button" onClick={() => setMode("login")} disabled={mode === "login"}>
          Login
        </button>
        <button type="button" onClick={() => setMode("register")} disabled={mode === "register"}>
          Register
        </button>
      </div>

      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      {mode === "register" && (
        <input
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={onChange("name")}
          required
          style={inputStyle}
        />
      )}

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={onChange("email")}
        required
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={onChange("password")}
        required
        style={inputStyle}
      />

      <button type="submit" style={{ width: "100%", padding: "10px" }}>
        {mode === "login" ? "Login" : "Register"}
      </button>
    </form>
  );
};

export default Landing;