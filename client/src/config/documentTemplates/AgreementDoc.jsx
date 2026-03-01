import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { s, formatDate, Header, MetaRow, SectionTitle, FieldRow, BodyText, Footer } from "./styles";

export default function AgreementDoc({ request }) {
  const fd = request.formData || {};
  const student = request.userId || {};

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header title="AGREEMENT FORM" />

        <MetaRow label="Date Approved" value={formatDate(request.updatedAt)} />
        <MetaRow label="Request ID" value={request._id} />

        <SectionTitle>Student / Requestor Information</SectionTitle>
        <FieldRow label="Name" value={student.name} />
        <FieldRow label="Email" value={student.email} />

        <SectionTitle>Data Form</SectionTitle>
        <FieldRow label="Representative" value={fd.repName} />
        <BodyText>{fd.details || "No details provided."}</BodyText>

        <SectionTitle>Notes</SectionTitle>
        <BodyText>(Placeholder — exact agreement clauses and formatting will go here.)</BodyText>

        <Footer />
      </Page>
    </Document>
  );
}