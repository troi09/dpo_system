/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#222" },

  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  headerSubtitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  headerOffice: { fontSize: 9, textAlign: "center", color: "#555", marginBottom: 12 },

  hr: { borderBottomWidth: 1, borderBottomColor: "#bbb", marginBottom: 12 },

  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { width: 105, fontFamily: "Helvetica-Bold", fontSize: 10 },
  metaValue: { flex: 1, fontSize: 10 },

  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: "#111" },

  fieldRow: { flexDirection: "row", marginBottom: 4, paddingLeft: 8 },
  fieldLabel: { width: 130, fontFamily: "Helvetica-Bold", fontSize: 10 },
  fieldValue: { flex: 1, fontSize: 10 },

  bodyText: { fontSize: 10, lineHeight: 1.6, paddingLeft: 8, marginBottom: 6 },

  footerWrap: { position: "absolute", bottom: 40, left: 40, right: 40 },
  footerHr: { borderBottomWidth: 1, borderBottomColor: "#bbb", marginBottom: 8 },
  footerRow: { flexDirection: "column", alignItems: "flex-start" },
  footerLeft: { flex: 1, paddingRight: 10 },
  footerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "left", marginBottom: 4 },
  footerNote: { fontSize: 8, textAlign: "left", color: "#888" },
  footerQrWrap: { alignItems: "flex-start", width: 90, marginTop: 8, paddingLeft: 8 },
  footerQr: { width: 70, height: 70 },
  footerQrLabel: { fontSize: 7, color: "#888", marginTop: 4, textAlign: "left" },
});

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US") : "N/A");

export const Header = ({ title, subtitle }) => (
  <View>
    <Text style={s.headerTitle}>{title}</Text>
    {subtitle ? <Text style={s.headerSubtitle}>{subtitle}</Text> : null}
    <Text style={s.headerOffice}>Data Protection Office</Text>
    <View style={s.hr} />
  </View>
);

export const MetaRow = ({ label, value }) => (
  <View style={s.metaRow}>
    <Text style={s.metaLabel}>{label}:</Text>
    <Text style={s.metaValue}>{String(value || "N/A")}</Text>
  </View>
);

export const SectionTitle = ({ children }) => <Text style={s.sectionTitle}>{children}</Text>;

export const FieldRow = ({ label, value }) => (
  <View style={s.fieldRow}>
    <Text style={s.fieldLabel}>{label}:</Text>
    <Text style={s.fieldValue}>{String(value || "N/A")}</Text>
  </View>
);

export const BodyText = ({ children }) => <Text style={s.bodyText}>{children}</Text>;

export const Footer = ({ qrDataUrl, verificationUrl }) => (
  <View style={s.footerWrap} fixed>
    <View style={s.footerHr} />
    <View style={s.footerRow}>
      <View style={s.footerLeft}>
        <Text style={s.footerTitle}>APPROVED — Data Protection Office</Text>
        <Text style={s.footerNote}>(Placeholder — e-signature + QR code will go here)</Text>
        {verificationUrl ? <Text style={s.footerNote}>{verificationUrl}</Text> : null}
      </View>
      {qrDataUrl ? (
        <View style={s.footerQrWrap}>
          <Image style={s.footerQr} src={qrDataUrl} />
          <Text style={s.footerQrLabel}>Scan to verify</Text>
        </View>
      ) : null}
    </View>
  </View>
);
