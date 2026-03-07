import React from "react";
import { Document, Page, Image, View, Text, StyleSheet } from "@react-pdf/renderer";
import { s, formatDate, Header, MetaRow, SectionTitle, FieldRow, BodyText, Footer } from "./styles";

const sigStyles = StyleSheet.create({
  sigSection: { marginTop: 20 },
  sigRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
  sigBlock: { width: "40%", alignItems: "center" },
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

export default function NDAStudentOrgActivitiesDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};
  const { authorizerSigUrl, adminSigDataUrl } = request;

  const hasAnySig = authorizerSigUrl || adminSigDataUrl;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header title="NON-DISCLOSURE AGREEMENT" subtitle="Student Organization Activities" />

        <MetaRow label="Date Approved" value={formatDate(request.updatedAt)} />
        <MetaRow label="Request ID" value={request._id} />

        <SectionTitle>Student Information</SectionTitle>
        <FieldRow label="Name" value={student.name} />
        <FieldRow label="Email" value={student.email} />

        <SectionTitle>Data Form</SectionTitle>
        <FieldRow label="Title" value={fd.title} />
        <BodyText>{fd.details || "No details provided."}</BodyText>

        <SectionTitle>Notes</SectionTitle>
        <BodyText>(Placeholder — NDA clauses and terms for student organization activities will be placed here.)</BodyText>

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
                label="DPO Admin"
                name="Data Protection Office"
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
