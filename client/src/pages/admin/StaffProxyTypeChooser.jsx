import StudentNewRequest from "../student/StudentNewRequest";

export default function StaffProxyTypeChooser() {
  return (
    <StudentNewRequest
      basePath="/admin/proxy-request"
      title="Create a Proxy Request for an F2F Walk-in"
    />
  );
}
