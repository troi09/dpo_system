import { Document, Page, View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import { formatDate, getTemplateAssetUrl } from "./styles";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#111",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  headerBlock: { width: "48%" },
  headerLeftTitle: { fontSize: 10, fontFamily: "Times-Bold" },
  headerLeftCode: { fontSize: 9, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerRightLine: { fontSize: 9 },
  logoRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12, marginBottom: 10 },
  logo: { width: 70, height: 70, objectFit: "contain", marginHorizontal: 8 },
  logoDpo: { width: 60, height: 60, objectFit: "contain", marginHorizontal: 8 },
  centerTextWrap: { alignItems: "center", marginHorizontal: 6 },
  centerLine: { fontSize: 10, textAlign: "center" },
  centerOffice: { fontSize: 10, textAlign: "center" },
  centerAgreement: { fontSize: 11, fontFamily: "Times-Bold", textAlign: "center", marginTop: 2 },
  paragraphNoIndent: {
    width: "85%",
    alignSelf: "center",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  afterParagraph: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "85%",
    alignSelf: "center",
  },
  rightColumn: { alignItems: "flex-end" },
  sigBlock: { width: 220, alignItems: "flex-start", marginBottom: 14 },
  sigImage: { width: 150, height: 50, objectFit: "contain", borderBottomWidth: 1, borderBottomColor: "#333" },
  sigPlaceholder: { width: 150, height: 50, borderBottomWidth: 1, borderBottomColor: "#333" },
  sigName: { fontSize: 10, fontFamily: "Times-Bold", marginTop: 4, textAlign: "left" },
  sigLabel: { fontSize: 8.5, textAlign: "left" },
  dateReceived: { fontSize: 9, alignSelf: "flex-start", marginBottom: 4, textAlign: "left" },
  qrWrap: { alignItems: "flex-start", marginBottom: 10 },
  qrImage: { width: 70, height: 70 },
});

const SigBlock = ({ label, name, imgUrl, dateReceived }) => (
  <View style={styles.sigBlock}>
    {dateReceived ? <Text style={styles.dateReceived}>{dateReceived}</Text> : null}
    {imgUrl
      ? <Image style={styles.sigImage} src={imgUrl} />
      : <View style={styles.sigPlaceholder} />
    }
    <Text style={styles.sigName}>{name || ""}</Text>
    <Text style={styles.sigLabel}>{label}</Text>
  </View>
);

export default function NDAStudentOrgActivitiesDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};
  const proxy = request.proxyRequestee || {};
  const displayName = proxy.isProxy ? (proxy.fullName || "") : (student.name || "");
  const displayEmail = proxy.isProxy ? (proxy.email || "") : (student.email || "");
  const displayIdNumber = proxy.isProxy ? (proxy.idNumber || "") : "";
  const displayDepartment = proxy.isProxy ? (proxy.departmentOrOrganization || "") : "";
  const { studentSigDataUrl, adminSigDataUrl } = request;
  const approverName = request.approverName || request.adminName || request.approvedByName || "";
  const toUpper = (value) => (value ? String(value).toUpperCase() : "");
  const studentNameUpper = toUpper(student.name);
  const hasAnySig = studentSigDataUrl || adminSigDataUrl;
  const rtuLogoSrc = getTemplateAssetUrl("rtu-logo.png");
  const dpoLogoSrc = getTemplateAssetUrl("dpo-logo-full.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerBlock}>
            <Text style={styles.headerLeftTitle}>RIZAL TECHNOLOGICAL UNIVERSITY</Text>
            <Text style={styles.headerLeftCode}>RTU-OP-UDPO-F002</Text>
          </View>
          <View style={[styles.headerBlock, styles.headerRight]}>
            <Text style={styles.headerRightLine}>Effectivity {formatDate(request.updatedAt)}</Text>
            <Text style={styles.headerRightLine}>Control # {request.serialNo || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.logoRow}>
          <Image style={styles.logo} src={rtuLogoSrc} />
          <View style={styles.centerTextWrap}>
            <Text style={styles.centerLine}>Rizal Technological University</Text>
            <Text style={styles.centerLine}>Boni Avenue, City of Mandaluyong</Text>
            <Text style={styles.centerOffice}>UNIVERSITY DATA PROTECTION CENTER</Text>
            <Text style={styles.centerAgreement}>NON-DISCLOSURE AGREEMENT</Text>
          </View>
          <Image style={styles.logoDpo} src={dpoLogoSrc} />
        </View>

        <Text style={styles.paragraphNoIndent}>
          "{fd.projectTitle || "________________"}"
        </Text>

        <View style={styles.afterParagraph}>
          {request.qrDataUrl ? (
            <View style={styles.qrWrap}>
              <Image style={styles.qrImage} src={request.qrDataUrl} />
            </View>
          ) : null}
          <View style={styles.rightColumn}>
            {hasAnySig ? (
              <>
                <SigBlock
                  label="Group Representative's signature over printed name"
                  name={studentNameUpper}
                  imgUrl={studentSigDataUrl || null}
                />
                <SigBlock
                  dateReceived={`Date Received: ${formatDate(request.updatedAt)}`}
                  label="Approving Officer's Signature over printed name"
                  name={toUpper(approverName)}
                  imgUrl={adminSigDataUrl || null}
                />
              </>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
