import React from "react";
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
  paragraph: {
    width: "85%",
    alignSelf: "center",
    textAlign: "justify",
    textIndent: 24,
    lineHeight: 1.25,
    marginTop: 14,
  },
  paragraphNoIndent: {
    width: "85%",
    alignSelf: "center",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  titleText: {
    fontFamily: "Times-BoldItalic",
  },
  paragraphFinal: {
    width: "85%",
    alignSelf: "center",
    textAlign: "justify",
    textIndent: 24,
    lineHeight: 1.25,
    marginTop: 14,
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
  const { studentSigDataUrl, adminSigDataUrl } = request;
  const approverName = request.approverName || request.adminName || request.approvedByName || "";
  const toUpper = (value) => (value ? String(value).toUpperCase() : "");
  const studentNameUpper = toUpper(proxy.isProxy ? (proxy.fullName || "") : (student.name || ""));
  const hasAnySig = studentSigDataUrl || adminSigDataUrl;
  const rtuLogoSrc = getTemplateAssetUrl("rtu-logo.png");
  const dpoLogoSrc = getTemplateAssetUrl("dpo-logo-full.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerBlock}>
            <Text style={styles.headerLeftTitle}>RIZAL TECHNOLOGICAL UNIVERSITY</Text>
            <Text style={styles.headerLeftCode}>RTU-OEVP-UDPC-F005</Text>
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

        <Text style={styles.paragraph}>
          I, {studentNameUpper || "________________"}, as the representative of the group, declare that it is our
          responsibility to protect the integrity and confidentiality of the enclosed information. As the intended
          recipient, we ensure that we will not reproduce, share, or disclose any information to anyone without the
          consent of the data subject. Furthermore, we affirm that the data will only be used to conduct the project
          titled:
        </Text>
        <Text style={styles.paragraphNoIndent}>
          <Text style={styles.titleText}>"{fd.projectTitle || "________________"}"</Text>
        </Text>
        <Text style={styles.paragraph}>
          We guarantee our commitment to strictly adhere to the Data Privacy Act of 2012, as well as any current and
          applicable Implementing Rules and Regulations of the National Privacy Commission and other relevant
          legislation, rules, and publications.
        </Text>
        <Text style={styles.paragraph}>
          We acknowledge the necessity of implementing the required security measures to protect the data, which
          includes establishing appropriate organizational, physical, and technical security actions. Any
          unauthorized disclosure, risk, or suspicious regarding such matters must be reported immediately to the
          Data Protection Office.
        </Text>
        <Text style={styles.paragraph}>
          We categorically guarantee that we will not reveal any generally Confidential, highly sensitive data, or
          private information obtained, either directly or indirectly, from the respondents to any third party.
        </Text>
        <Text style={styles.paragraphFinal}>
          Finally, we understand that we may be held liable for any damages caused by the unauthorized processing of
          this information.
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
