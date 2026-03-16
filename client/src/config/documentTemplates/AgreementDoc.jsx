import React from "react";
import { Document, Page, Image, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatDate, getTemplateAssetUrl } from "./styles";

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    fontSize: 8.6,
    fontFamily: "Times-Roman",
    color: "#111",
  },
  copyCard: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    minHeight: 348,
  },
  copySpacer: { height: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerBlock: { width: "48%" },
  headerLeftTitle: { fontSize: 7.8, fontFamily: "Times-Bold" },
  headerLeftCode: { fontSize: 7, marginTop: 1 },
  headerRight: { alignItems: "flex-end" },
  headerRightLine: { fontSize: 7 },
  logoRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 6, marginBottom: 6 },
  logo: { width: 32, height: 32, objectFit: "contain", marginHorizontal: 6 },
  logoDpo: { width: 28, height: 28, objectFit: "contain", marginHorizontal: 6 },
  centerTextWrap: { alignItems: "center", marginHorizontal: 4 },
  centerLine: { fontSize: 7.4, textAlign: "center" },
  centerOffice: { fontSize: 7.4, textAlign: "center" },
  centerAgreement: { fontSize: 8.6, fontFamily: "Times-Bold", textAlign: "center", marginTop: 1 },
  paragraph: {
    width: "92%",
    alignSelf: "center",
    textAlign: "justify",
    textIndent: 12,
    lineHeight: 1.18,
    marginTop: 4,
  },
  paragraphFinal: {
    width: "92%",
    alignSelf: "center",
    textAlign: "justify",
    textIndent: 12,
    lineHeight: 1.18,
    marginTop: 4,
  },
  afterParagraph: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "92%",
    alignSelf: "center",
  },
  rightColumn: { alignItems: "flex-end" },
  sigBlock: { width: 158, alignItems: "flex-start", marginBottom: 6 },
  sigImage: { width: 122, height: 28, objectFit: "contain", borderBottomWidth: 0.8, borderBottomColor: "#333" },
  sigPlaceholder: { width: 122, height: 28, borderBottomWidth: 0.8, borderBottomColor: "#333" },
  sigName: { fontSize: 7.4, fontFamily: "Times-Bold", marginTop: 2, textAlign: "left" },
  sigLabel: { fontSize: 6.8, textAlign: "left" },
  dateReceived: { fontSize: 7, alignSelf: "flex-start", marginBottom: 2, textAlign: "left" },
  qrWrap: { alignItems: "flex-start", marginBottom: 4 },
  qrImage: { width: 44, height: 44 },
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

/**
 * AgreementDoc renders progressively based on which signatures are present:
 *  - authorizerSigUrl  → shown from phase2 preview onward
 *  - repSigUrl         → shown from phase3 review onward
 *  - adminSigDataUrl   → only in the final approved PDF
 */
export default function AgreementDoc({ request }) {
  const student = request.userId || {};
  const proxy = request.proxyRequestee || {};
  const repInfo = request.repInfo || {};
  const { authorizerSigUrl, repSigUrl, adminSigDataUrl } = request;
  const approverName = request.approverName || request.adminName || request.approvedByName || "";
  const toUpper = (value) => (value ? String(value).toUpperCase() : "");
  const repNameFromForm = [
    request.formData?.repFirstName,
    request.formData?.repMiddleInitial,
    request.formData?.repLastName,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const recipientName = repInfo.name || repNameFromForm || request.formData?.repName;
  const rtuLogoSrc = getTemplateAssetUrl("rtu-logo.png");
  const dpoLogoSrc = getTemplateAssetUrl("dpo-logo-full.png");

  const hasAnySig = authorizerSigUrl || repSigUrl || adminSigDataUrl;

  const AgreementCopy = () => (
    <View style={styles.copyCard}>
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
          <Text style={styles.centerAgreement}>AGREEMENT</Text>
        </View>
        <Image style={styles.logoDpo} src={dpoLogoSrc} />
      </View>

      <Text style={styles.paragraph}>
        I declare that as the intended recipient, it is my responsibility to safeguard the integrity and
        confidentiality of the enclosed information. As such, I ensure not to reproduce, share, or in any way
        disclose any information to anyone without the consent of the data subject. Further, I attest that the
        herein data shall be used for processing of school credentials.
      </Text>
      <Text style={styles.paragraphFinal}>
        Finally, I understand that I may be held liable for any damage caused by unauthorized processing of
        information.
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
                label="Authorizer's signature over printed name"
                name={toUpper(proxy.isProxy ? (proxy.fullName || "") : (student.name || ""))}
                imgUrl={authorizerSigUrl || null}
              />
              <SigBlock
                label="Recipient's signature over printed name"
                name={toUpper(recipientName)}
                imgUrl={repSigUrl || null}
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
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <AgreementCopy />
        <View style={styles.copySpacer} />
        <AgreementCopy />
      </Page>
    </Document>
  );
}
