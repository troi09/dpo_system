import StudentNDATypeChooser from "../student/StudentNDATypeChooser";

export default function StaffProxyNDATypeChooser() {
  return <StudentNDATypeChooser basePath="/admin/proxy-request/nda" fallbackPath="/admin" />;
}
