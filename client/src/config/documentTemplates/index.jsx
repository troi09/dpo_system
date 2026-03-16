/* eslint-disable react-refresh/only-export-components */
import React from "react";

const renderFallbackDoc = ({ request, renderer, styles }) => {
  const { Document, Page } = renderer;
  const { s, Header, BodyText, Footer } = styles;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header title="APPROVED DOCUMENT" />
        <BodyText>Approved document for request {request?._id}</BodyText>
        <BodyText>(No template found for this request type)</BodyText>
        <Footer />
      </Page>
    </Document>
  );
};

export const generateApprovedPDF = async (request) => {
  const [renderer, styles] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./styles"),
  ]);

  let DocComponent = null;

  if (request.type === "agreement") {
    const mod = await import("./AgreementDoc");
    DocComponent = mod.default;
  } else if (request.type === "nda") {
    const t = request.formData?.ndaType;
    if (t === "orgactivities") {
      const mod = await import("./NDAStudentOrgActivitiesDoc");
      DocComponent = mod.default;
    } else if (t === "research") {
      const mod = await import("./NDAResearchDoc");
      DocComponent = mod.default;
    }
  }

  const doc = DocComponent
    ? <DocComponent request={request} />
    : renderFallbackDoc({ request, renderer, styles });

  const blob = await renderer.pdf(doc).toBlob();
  return new Blob([blob], { type: "application/pdf" });
};
