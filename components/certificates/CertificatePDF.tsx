// components/certificates/CertificatePDF.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

const dateLocales: Record<string, Locale> = { en: enUS, fr, rw: enUS };

const i18n = {
  en: {
    title: "Certificate of Completion",
    subtitle: "This is to certify that",
    courseLabel: "has successfully completed the course",
    dateLabel: "Date of Completion",
    codeLabel: "Certificate Code",
    orgLabel: "Mbaza Program",
    programLabel: "TwihugureHub Agricultural Training Platform",
  },
  fr: {
    title: "Certificat d'Achèvement",
    subtitle: "Ceci certifie que",
    courseLabel: "a réussi avec succès le cours",
    dateLabel: "Date d'achèvement",
    codeLabel: "Code du certificat",
    orgLabel: "Programme Mbaza",
    programLabel: "Plateforme de Formation Agricole TwihugureHub",
  },
  rw: {
    title: "Impamyabumenyi y'Isomo",
    subtitle: "Iyi mpamyabumenyi ihamya ko",
    courseLabel: "arangije neza isomo",
    dateLabel: "Itariki yo kurangiza",
    codeLabel: "Kode y'impamyabumenyi",
    orgLabel: "Porogaramu ya Mbaza",
    programLabel: "Urubuga rw'Amahugurwa y'Ubuhinzi TwihugureHub",
  },
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FAFFF6",
    padding: 0,
    fontFamily: "Helvetica",
  },
  outerBorder: {
    margin: 24,
    borderWidth: 4,
    borderColor: "#2D6A4F",
    borderStyle: "solid",
    borderRadius: 4,
    flex: 1,
  },
  innerBorder: {
    margin: 8,
    borderWidth: 1.5,
    borderColor: "#74C69D",
    borderStyle: "solid",
    flex: 1,
    padding: 32,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  orgName: {
    fontSize: 11,
    color: "#2D6A4F",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: "#74C69D",
    marginBottom: 16,
  },
  certTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#1B4332",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  certSubtitle: {
    fontSize: 11,
    color: "#555",
    marginBottom: 24,
  },
  farmerName: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
    marginBottom: 16,
    textAlign: "center",
  },
  courseLabel: {
    fontSize: 11,
    color: "#555",
    marginBottom: 8,
    textAlign: "center",
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1B4332",
    marginBottom: 24,
    textAlign: "center",
  },
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: "#B7E4C7",
    marginVertical: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  footerItem: {
    alignItems: "center",
    width: "45%",
  },
  footerLabel: {
    fontSize: 9,
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    textAlign: "center",
  },
  signatureLine: {
    width: "60%",
    height: 1,
    backgroundColor: "#2D6A4F",
    marginBottom: 4,
    marginTop: 24,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#2D6A4F",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  programLabel: {
    fontSize: 8,
    color: "#888",
    marginTop: 2,
    textAlign: "center",
  },
  leafDecor: {
    fontSize: 18,
    color: "#74C69D",
    marginBottom: 4,
  },
  codeBox: {
    backgroundColor: "#F0FAF4",
    borderWidth: 1,
    borderColor: "#B7E4C7",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  codeText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
    letterSpacing: 2,
  },
});

interface CertificatePDFProps {
  farmerName: string;
  courseTitle: string;
  issuedAt: Date;
  certificateCode: string;
  language: "en" | "fr" | "rw";
}

export function CertificatePDF({
  farmerName,
  courseTitle,
  issuedAt,
  certificateCode,
  language,
}: CertificatePDFProps) {
  const t = i18n[language] ?? i18n.en;
  const dateLocale = dateLocales[language] ?? enUS;
  const formattedDate = format(new Date(issuedAt), "PPP", { locale: dateLocale });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.orgName}>{t.orgLabel}</Text>
              <View style={styles.decorativeLine} />
              <Text style={styles.certTitle}>{t.title}</Text>
              <Text style={styles.certSubtitle}>{t.subtitle}</Text>
            </View>

            {/* Farmer Name */}
            <Text style={styles.farmerName}>{farmerName}</Text>

            {/* Course */}
            <Text style={styles.courseLabel}>{t.courseLabel}</Text>
            <Text style={styles.courseTitle}>{courseTitle}</Text>

            <View style={styles.divider} />

            {/* Footer details */}
            <View style={styles.footer}>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>{t.dateLabel}</Text>
                <Text style={styles.footerValue}>{formattedDate}</Text>
              </View>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>{t.codeLabel}</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{certificateCode}</Text>
                </View>
              </View>
            </View>

            {/* Signature */}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{t.orgLabel}</Text>
            <Text style={styles.programLabel}>{t.programLabel}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
