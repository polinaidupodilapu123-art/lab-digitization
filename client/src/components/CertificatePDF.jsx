import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import aknuLogo from '../assets/aknu_logo.png';
import nannayaLogo from '../assets/nannaya_logo.png';

// Register Telugu Font for any potential Telugu characters in college names
Font.register({
  family: 'TeluguMandali',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mandali/Mandali-Regular.ttf'
});

const BORDER_COLOR = '#1f2937';
const PAGE_INSET = 20;
const FRAME_BORDER = 2;

const styles = StyleSheet.create({
  pageCanvas: {
    flexDirection: 'column',
    padding: PAGE_INSET,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 12,
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
    paddingTop: 24,
    paddingBottom: 24,
  },
  univHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1.5,
    borderBottomColor: '#fcc203',
    paddingBottom: 15,
  },
  univTextContainer: {
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  aknuTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#115e59',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  aknuTelugu: {
    fontSize: 16,
    fontFamily: 'TeluguMandali',
    color: '#115e59', // Optional dark red or black
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuLocation: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuAccreditation: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuTagline: {
    fontSize: 9,
    color: '#111827',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logoImg: {
    width: 65,
    height: 65,
    objectFit: 'contain',
  },
  logoImgRight: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  certificateTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    textDecoration: 'underline',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 2.2,
    textAlign: 'justify',
  },
  fillBlank: {
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'none',
  },
  blankUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingTop: 50,
  },
  controllerSign: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  controllerSignText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 40,
  }
});

const CertificatePDF = ({ user, completionDate }) => {
  const collegeName = user?.collegeId?.collegeName || user?.collegeName || "ADIKAVI NANNAYA UNIVERSITY AFFILIATED COLLEGE";
  const fullName = user?.fullName || "Student Name";
  const regdNo = user?.regdNo || "Roll Number";
  const semester = user?.currentSemester || "Semester";
  
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.pageCanvas}>
        <View style={styles.borderFrame}>
          {/* Header */}
          <View style={styles.univHeader}>
            <Image src={aknuLogo} style={styles.logoImg} />
            <View style={styles.univTextContainer}>
              <Text style={styles.aknuTitle}>ADIKAVI NANNAYA UNIVERSITY</Text>
              <Text style={styles.aknuTelugu}>ఆదికవి నన్నయ విశ్వవిద్యాలయం</Text>
              <Text style={styles.aknuLocation}>RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296.</Text>
              <Text style={styles.aknuAccreditation}>Accredited by NAAC with 'B+' Grade ISO 9001:2025 Certified 5 Star Rated</Text>
              <Text style={styles.aknuTagline}>Largest State University in Andhra Pradesh in terms of Affiliation</Text>
            </View>
            <Image src={nannayaLogo} style={styles.logoImgRight} />
          </View>
          
          {/* Title */}
          <Text style={styles.certificateTitle}>CERTIFICATE</Text>
          
          {/* Body */}
          <Text style={styles.bodyText}>
            This is to certify that Mr/Mrs <Text style={styles.fillBlank}> {fullName} </Text>, 
            a student of <Text style={styles.fillBlank}> {collegeName} </Text> 
            bearing Regd.No <Text style={styles.fillBlank}> {regdNo} </Text> 
            has successfully submitted his/her <Text style={styles.fillBlank}> {semester} </Text> semester projects/records 
            through online portal on <Text style={styles.fillBlank}> {completionDate} </Text>.
          </Text>

          {/* Footer Signature */}
          <View style={styles.footer}>
            <View style={styles.controllerSign}>
              <Text style={styles.controllerSignText}>CONTROLLER OF EXAMINATIONS</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CertificatePDF;
