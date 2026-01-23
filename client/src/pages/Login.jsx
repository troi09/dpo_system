import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { login as loginService } from "../services/authService";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await loginService(email, password);
      login(data.user);

      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid credentials");
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
      <h2>Login</h2>

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
        Login
      </button>
    </form>
  );
};

export default Login;
