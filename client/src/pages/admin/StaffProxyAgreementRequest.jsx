import StudentAgreementRequest from "../student/StudentAgreementRequest";

export default function StaffProxyAgreementRequest() {
  return <StudentAgreementRequest proxyMode fallbackPath="/admin" />;
}
