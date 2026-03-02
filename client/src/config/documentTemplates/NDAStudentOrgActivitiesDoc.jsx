import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { s, formatDate, Header, MetaRow, SectionTitle, FieldRow, BodyText, Footer } from "./styles";

export default function NDAStudentOrgActivitiesDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};

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
        <BodyText>(Placeholder — NDA clauses, signatory blocks, QR code, and e-signature.)</BodyText>

        <Footer qrDataUrl={request.qrDataUrl} verificationUrl={request.verificationUrl} />
      </Page>
    </Document>
  );
}