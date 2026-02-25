import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password,
      });

      alert(res.data.message || "Registered successfully!");
      setName("");
      setEmail("");
      setPassword("");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "30px",
        borderRadius: "8px",
        width: "320px",
        textAlign: "center",
      }}
    >
      <h2>Register</h2>

      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <button type="submit" style={{ width: "100%", padding: "10px" }}>
        Register
      </button>
    </form>
  );
};

export default Register;
