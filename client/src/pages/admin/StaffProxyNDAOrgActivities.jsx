import StudentNDARequest from "../student/StudentNDARequest";

export default function StaffProxyNDAOrgActivities() {
  return <StudentNDARequest ndaType="orgactivities" proxyMode fallbackPath="/admin" />;
}
