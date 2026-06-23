const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { formatDoctorName } = require('../utils/doctorName');

exports.generatePrescriptionPDF = async (appointment, consultation) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      const fileName = `prescription_${appointment.id}.pdf`;
      const dirPath = path.join(__dirname, '../../public/prescriptions');
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const filePath = path.join(dirPath, fileName);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('CareBridge', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Consultation Summary & Prescription', { align: 'center' });
      doc.moveDown(2);

      // Info Block
      doc.fontSize(12).font('Helvetica-Bold').text('Consultation Details:');
      doc.font('Helvetica').text(`Date: ${new Date(appointment.createdAt).toLocaleDateString()}`);
      doc.text(`Doctor: ${formatDoctorName(appointment.doctor.name, appointment.doctor.name)}`);
      doc.text(`Patient: ${appointment.patient.name}`);
      doc.text(`Consultation ID: ${appointment.id}`);
      doc.moveDown(1.5);

      // AI Triage Summary
      if (appointment.aiSummary) {
        doc.font('Helvetica-Bold').text('Initial AI Triage Summary:');
        doc.font('Helvetica').text(`Primary Symptom: ${appointment.aiSummary.primary_symptom || 'N/A'}`);
        doc.text(`Duration: ${appointment.aiSummary.duration || 'N/A'}`);
        doc.text(`Severity: ${appointment.aiSummary.severity || 'N/A'}/10`);
        doc.moveDown(1.5);
      }

      // Doctor Notes
      doc.font('Helvetica-Bold').text('Clinical Notes:');
      doc.font('Helvetica').text(consultation.notes || 'No notes provided.');
      doc.moveDown(1.5);

      // Prescription
      doc.font('Helvetica-Bold').text('Prescription:');
      if (consultation.prescription && Array.isArray(consultation.prescription) && consultation.prescription.length > 0) {
        consultation.prescription.forEach((med, index) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. ${med.name}`);
          doc.font('Helvetica').text(`   Dosage: ${med.dosage} | Frequency: ${med.frequency} | Duration: ${med.duration}`);
          doc.moveDown(0.5);
        });
      } else {
        doc.font('Helvetica').text('No medications prescribed.');
      }

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).font('Helvetica-Oblique').text('This is a digitally generated document and does not require a physical signature.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/prescriptions/${fileName}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
};
