/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { pdf, Document, Page } from "@react-pdf/renderer";
import { s, Header, BodyText, Footer } from "./styles";

import AgreementDoc from "./AgreementDoc";
import NDAStudentOrgActivitiesDoc from "./NDAStudentOrgActivitiesDoc";
import NDAResearchDoc from "./NDAResearchDoc";

const FallbackDoc = ({ request }) => (
  <Document>
    <Page size="A4" style={s.page}>
      <Header title="APPROVED DOCUMENT" />
      <BodyText>Approved document for request {request?._id}</BodyText>
      <BodyText>(No template found for this request type)</BodyText>
      <Footer />
    </Page>
  </Document>
);

const resolveDoc = (request) => {
  if (request.type === "agreement") return <AgreementDoc request={request} />;

  if (request.type === "nda") {
    const t = request.formData?.ndaType;
    if (t === "orgactivities") return <NDAStudentOrgActivitiesDoc request={request} />;
    if (t === "research") return <NDAResearchDoc request={request} />;
  }

  return <FallbackDoc request={request} />;
};

export const generateApprovedPDF = async (request) => {
  const blob = await pdf(resolveDoc(request)).toBlob();
  return new Blob([blob], { type: "application/pdf" }); // ensure correct mime type
};
