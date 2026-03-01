import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { s, formatDate, Header, MetaRow, SectionTitle, FieldRow, BodyText, Footer } from "./styles";

export default function NDAResearchDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header title="NON-DISCLOSURE AGREEMENT" subtitle="Conduct of Research" />

        <MetaRow label="Date Approved" value={formatDate(request.updatedAt)} />
        <MetaRow label="Request ID" value={request._id} />

        <SectionTitle>Student Information</SectionTitle>
        <FieldRow label="Name" value={student.name} />
        <FieldRow label="Email" value={student.email} />

        <SectionTitle>Data Form</SectionTitle>
        <FieldRow label="Data Field 1" value={fd["1dataField"]} />
        <FieldRow label="Data Field 2" value={fd["2dataField"]} />
        <FieldRow label="Data Field 3" value={fd["3dataField"]} />

        <SectionTitle>Notes</SectionTitle>
        <BodyText>(Placeholder — research NDA clauses, signatory blocks, QR code, and e-signature.)</BodyText>

        <Footer />
      </Page>
    </Document>
  );
}