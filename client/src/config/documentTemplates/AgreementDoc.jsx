import React from "react";
import { Document, Page, Image, View, Text, StyleSheet } from "@react-pdf/renderer";
import { s, formatDate, Header, MetaRow, SectionTitle, FieldRow, BodyText, Footer } from "./styles";

const sigStyles = StyleSheet.create({
  sigSection: { marginTop: 20 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  sigBlock: { width: "30%", alignItems: "center" },
  sigImage: { width: 120, height: 50, objectFit: "contain", borderBottomWidth: 1, borderBottomColor: "#aaa" },
  sigPlaceholder: { width: 120, height: 50, borderBottomWidth: 1, borderBottomColor: "#aaa" },
  sigLabel: { fontSize: 8, color: "#555", marginTop: 4, textAlign: "center" },
  sigName: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center" },
});

const SigBlock = ({ label, name, imgUrl }) => (
  <View style={sigStyles.sigBlock}>
    {imgUrl
      ? <Image style={sigStyles.sigImage} src={imgUrl} />
      : <View style={sigStyles.sigPlaceholder} />
    }
    <Text style={sigStyles.sigName}>{name || ""}</Text>
    <Text style={sigStyles.sigLabel}>{label}</Text>
  </View>
);

/**
 * AgreementDoc renders progressively based on which signatures are present:
 *  - authorizerSigUrl  → shown from phase2 preview onward
 *  - repSigUrl         → shown from phase3 review onward
 *  - adminSigDataUrl   → only in the final approved PDF
 */
export default function AgreementDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};
  const repInfo = request.repInfo || {};
  const { authorizerSigUrl, repSigUrl, adminSigDataUrl } = request;

  const hasAnySig = authorizerSigUrl || repSigUrl || adminSigDataUrl;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header title="AGREEMENT FORM" />

        <MetaRow label="Date" value={formatDate(request.updatedAt)} />
        <MetaRow label="Request ID" value={request._id} />

        <SectionTitle>Student / Requestor Information</SectionTitle>
        <FieldRow label="Name" value={student.name} />
        <FieldRow label="Email" value={student.email} />

        <SectionTitle>Data Form</SectionTitle>
        <FieldRow label="Representative" value={fd.repName} />
        <BodyText>{fd.details || "No details provided."}</BodyText>

        {repInfo.name ? (
          <>
            <SectionTitle>Representative Information</SectionTitle>
            <FieldRow label="Name" value={repInfo.name} />
          </>
        ) : null}

        <SectionTitle>Notes</SectionTitle>
        <BodyText>(Placeholder — exact agreement clauses and formatting will go here.)</BodyText>

        {hasAnySig && (
          <View style={sigStyles.sigSection}>
            <SectionTitle>Signatures</SectionTitle>
            <View style={sigStyles.sigRow}>
              <SigBlock
                label="Authorizer / Student"
                name={student.name}
                imgUrl={authorizerSigUrl || null}
              />
              <SigBlock
                label="Representative"
                name={repInfo.name || fd.repName}
                imgUrl={repSigUrl || null}
              />
              <SigBlock
                label="Data Protection Office"
                name="DPO Admin"
                imgUrl={adminSigDataUrl || null}
              />
            </View>
          </View>
        )}

        <Footer qrDataUrl={request.qrDataUrl} verificationUrl={request.verificationUrl} />
      </Page>
    </Document>
  );
}
