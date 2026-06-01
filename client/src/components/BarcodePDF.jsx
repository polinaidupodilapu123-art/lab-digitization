import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import aknuLogo from '../assets/aknu_logo.png';
import nannayaLogo from '../assets/nannaya_logo.png';

// Register Telugu Font from Google Fonts raw repository to properly render Telugu characters in PDF
Font.register({
  family: 'TeluguMandali',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mandali/Mandali-Regular.ttf'
});

const BORDER_COLOR = '#1f2937';
const PAGE_INSET = 14;
const FRAME_BORDER = 1.5;

const styles = StyleSheet.create({
  pageCanvas: {
    flexDirection: 'column',
    padding: PAGE_INSET,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
  },
  borderFrame: {
    flexGrow: 1,
    flexDirection: 'column',
    borderWidth: FRAME_BORDER,
    borderStyle: 'solid',
    borderColor: BORDER_COLOR,
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTopLeft: {
    width: '100%',
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleLine: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'left',
  },
  univHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fcc203',
    paddingBottom: 6,
  },
  univTextContainer: {
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  logoLeft: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  logoRight: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  univTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#115e59', // Teal 800
    textAlign: 'center',
  },
  univSubtitle: {
    fontSize: 11,
    fontFamily: 'TeluguMandali',
    color: '#115e59',
    marginTop: 2,
    textAlign: 'center',
  },
  univLocation: {
    fontSize: 8.5,
    color: '#4b5563',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  univAccreditation: {
    fontSize: 7.5,
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  univAffiliation: {
    fontSize: 7.5,
    color: '#374151',
    marginTop: 2,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  certTitle: {
    fontSize: 22,
    fontFamily: 'Times-Italic',
    textAlign: 'center',
    color: '#111827',
    marginTop: 15,
    marginBottom: 15,
  },
  middle: {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 15,
  },
  bodyColumn: {
    width: '90%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  bodyLine: {
    fontSize: 12,
    lineHeight: 1.8,
    textAlign: 'left',
    marginBottom: 10,
  },
  bodyValueBold: {
    fontFamily: 'Helvetica-Bold',
  },
  undertakingTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 5,
    color: '#111827',
  },
  undertakingText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    color: '#111827',
    marginBottom: 20,
    width: '90%',
    alignSelf: 'center',
  },
  studentSigRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 35,
  },
  signaturesBlock: {
    marginTop: 10,
    marginBottom: 10,
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigCol: {
    width: '45%',
    borderTopWidth: 0.5,
    borderTopColor: '#111827',
    paddingTop: 6,
  },
  sigText: {
    fontSize: 8.5,
    textAlign: 'center',
    color: '#374151',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 8,
    paddingBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  footerDate: {
    fontSize: 9,
    color: '#4b5563',
  },
  footerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  pageNumRight: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    marginBottom: 4,
  },
  barcodeImg: {
    width: 140,
    height: 32,
    objectFit: 'contain',
  },
  blankFill: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  }
});

function formatFooterDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const BarcodePDF = ({ assignment, barcodeDataUrl, user }) => {
  const student = assignment.studentId || {};
  const collegeName = student.collegeId?.collegeName || user?.collegeName || "ADIKAVI NANNAYA UNIVERSITY AFFILIATED COLLEGE";
  const courseName = student.courseId?.courseName || user?.courseName || "B.Ed. Programme";
  const semester = student.currentSemester || assignment.subjectId?.semester || "Semester II";
  const fullName = student.fullName || user?.fullName || "Student Name";
  const regdNo = student.regdNo || user?.regdNo || "Roll Number";
  const subjectName = assignment.groupSubjectName || assignment.subjectId?.subName || "Subject Name";
  const subjectCode = assignment.subjectId?.subCode || "Subject Code";
  
  const pagesCount = Math.max(1, Math.min(99, Math.floor(assignment.pagesRequired || 10)));
  const totalPages = pagesCount + 1;
  const footerDate = formatFooterDate();

  const continuationPages = Array.from({ length: pagesCount }, (_, i) => (
    <Page key={`blank-${i}`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        {/* Top Header */}
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>
        
        {/* Blank content grid space */}
        <View style={styles.blankFill} />
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{i + 2} / {totalPages}</Text>
            {barcodeDataUrl && <Image src={barcodeDataUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  ));

  return (
    <Document>
      {/* Cover Page / Certificate */}
      <Page size="A4" style={styles.pageCanvas}>
        <View style={styles.borderFrame}>
          {/* Top Header */}
          <View style={styles.headerTopLeft}>
            <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
          </View>
          
          {/* University Title & Logos */}
          <View style={styles.univHeader}>
            <Image src={aknuLogo} style={styles.logoLeft} />
            <View style={styles.univTextContainer}>
              <Text style={styles.univTitle}>ADIKAVI NANNAYA UNIVERSITY</Text>
              <Text style={styles.univSubtitle}>ఆదికవి నన్నయ విశ్వవిద్యాలయం</Text>
              <Text style={styles.univLocation}>RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296.</Text>
              <Text style={styles.univAccreditation}>Accredited by NAAC with 'B+' Grade ISO 9001:2025 Certified 5 Star Rated</Text>
              <Text style={styles.univAffiliation}>Largest State University in Andhra Pradesh in terms of Affiliation</Text>
            </View>
            <Image src={nannayaLogo} style={styles.logoRight} />
          </View>


          {/* Certificate Title */}
          <Text style={styles.certTitle}>Certificate</Text>

          {/* Core certificate details */}
          <View style={styles.middle}>
            <View style={styles.bodyColumn}>
              <Text style={styles.bodyLine}>
                This is to Certify that Candidate with particulars:
              </Text>
              <Text style={styles.bodyLine}>
                Name : Sri/Smt./Kum. <Text style={styles.bodyValueBold}>{fullName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Registration Number : <Text style={styles.bodyValueBold}>{regdNo}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                College : <Text style={styles.bodyValueBold}>{collegeName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Semester : <Text style={styles.bodyValueBold}>{semester}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Record/Assignment of Subject : <Text style={styles.bodyValueBold}>{subjectName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                has submitted for his/her accomplishment of <Text style={styles.bodyValueBold}>{courseName}.</Text>
              </Text>
          </View>

          {/* Undertaking Section */}
          <Text style={styles.undertakingTitle}>UNDERTAKING BY THE PRINCIPAL AND CONCERN FACULTY</Text>
          <Text style={styles.undertakingText}>
            I endorsed that the handwriting in the Record or Project work is by concerned student only. I agree if it is found that, it is fake and it is not written by the student I know that me and concerned faculty can be held responsible and accept for any action/punishment for this malpractice as per the University norms.
          </Text>
        </View>


          {/* Student Signature Line */}
          <View style={styles.studentSigRow}>
            <View style={styles.sigCol}>
              <Text style={styles.sigText}>Signature of the Student</Text>
            </View>
          </View>

          {/* Examiner and principal signature lines */}
          <View style={styles.signaturesBlock}>
            <View style={styles.sigRow}>
              <View style={styles.sigCol}>
                <Text style={styles.sigText}>Signature of the Lecturer</Text>
              </View>
              <View style={styles.sigCol}>
                <Text style={styles.sigText}>Signature of the Principal with Seal</Text>
              </View>
            </View>
          </View>

          {/* Cover Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerDate}>{footerDate}</Text>
            <View style={styles.footerRight}>
              <Text style={styles.pageNumRight}>1 / {totalPages}</Text>
              {barcodeDataUrl && <Image src={barcodeDataUrl} style={styles.barcodeImg} />}
            </View>
          </View>
        </View>
      </Page>
      {continuationPages}
    </Document>
  );
};

export default BarcodePDF;
