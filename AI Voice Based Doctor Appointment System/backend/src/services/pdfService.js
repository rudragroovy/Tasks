const PDFDocument = require('pdfkit');
const { formatDoctorName } = require('../utils/doctorName');
const { uploadBufferToS3 } = require('./s3UploadService');

exports.generatePrescriptionPDF = async (appointment, consultation) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      const fileName = `prescription_${appointment.id}.pdf`;
      doc.on('data', (chunk) => chunks.push(chunk));

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
          const medicineName = String(med?.drugName || med?.name || 'Medicine').trim();
          const dosageLabel = String(
            med?.dosage ||
            `${String(med?.dose || '').trim()}${med?.doseUnit ? ` ${String(med.doseUnit).trim()}` : ''}`.trim()
          ).trim();
          const frequencyLabel = String(med?.frequency || '').trim();
          const durationLabel = String(
            med?.duration ||
            `${String(med?.durationValue || '').trim()}${med?.durationUnit ? ` ${String(med.durationUnit).trim()}` : ''}`.trim()
          ).trim();
          const routeLabel = String(med?.route || '').trim();
          const repeatsLabel = String(med?.repeats || '').trim();
          const directionsLabel = String(med?.directions || '').trim();

          doc.font('Helvetica-Bold').text(`${index + 1}. ${medicineName}`);
          doc.font('Helvetica').text(
            `   Dosage: ${dosageLabel || 'N/A'} | Frequency: ${frequencyLabel || 'N/A'} | Duration: ${durationLabel || 'N/A'}`
          );
          if (routeLabel) {
            doc.font('Helvetica').text(`   Route: ${routeLabel}`);
          }
          if (repeatsLabel) {
            doc.font('Helvetica').text(`   Repeats: ${repeatsLabel}`);
          }
          if (directionsLabel) {
            doc.font('Helvetica').text(`   Directions: ${directionsLabel}`);
          }
          doc.moveDown(0.5);
        });
      } else {
        doc.font('Helvetica').text('No medications prescribed.');
      }

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).font('Helvetica-Oblique').text('This is a digitally generated document and does not require a physical signature.', { align: 'center' });

      doc.end();

      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const uploaded = await uploadBufferToS3({
            file: {
              buffer: pdfBuffer,
              size: pdfBuffer.length,
              mimetype: 'application/pdf',
              originalname: fileName,
            },
            userId: appointment.patientId || appointment.patient?.id || appointment.id,
            context: 'prescriptions',
          });
          resolve(uploaded.url);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      doc.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
