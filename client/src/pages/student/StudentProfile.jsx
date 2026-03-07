import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const StudentProfile = () => {
  const { user } = useContext(AuthContext);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">
          <span className="profile-avatar-initials">{initials}</span>
        </div>
        <p className="profile-name">{user?.name}</p>
        <p className="profile-email">{user?.email}</p>
        <span className="profile-role-badge">{user?.role}</span>
      </div>
    </div>
  );
};

export default StudentProfile;
