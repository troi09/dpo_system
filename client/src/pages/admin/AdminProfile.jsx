import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const AdminProfile = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Admin Profile</h2>
      <p><b>Name:</b> {user?.name}</p>
      <p><b>Role:</b> {user?.role}</p>
    </div>
  );
};

export default AdminProfile;
