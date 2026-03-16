import StudentNDARequest from "../student/StudentNDARequest";

export default function StaffProxyNDAResearch() {
  return <StudentNDARequest ndaType="research" proxyMode fallbackPath="/admin" />;
}
