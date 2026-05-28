import PDFDocument from 'pdfkit';

/**
 * Generate a professional Title Report PDF with LINZ data
 */
export async function generateTitleReportPDF(
  property: any,
  linzData: any | null,
  orderDetails: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Property Title Report',
          Author: 'HouseMatch Property Platform',
          Subject: `Title Report - ${property?.address || orderDetails.propertyAddress}`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with branding
      doc
        .fillColor('#3b82f6')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('PROPERTY TITLE REPORT', { align: 'center' });

      doc
        .moveDown(0.3)
        .fillColor('#60a5fa')
        .fontSize(12)
        .text('Official Title Search & Analysis', { align: 'center' });

      doc
        .moveDown(0.5)
        .fillColor('#666')
        .fontSize(10)
        .font('Helvetica')
        .text('HouseMatch Property Platform', { align: 'center' })
        .text(`Generated: ${new Date().toLocaleString('en-NZ')}`, { align: 'center' })
        .moveDown(1);

      // Order ID box
      const orderBoxY = doc.y;
      doc
        .fillColor('#eff6ff')
        .rect(50, orderBoxY, 495, 30)
        .fill()
        .fillColor('#3b82f6')
        .fontSize(10)
        .text(`Report ID: ${orderDetails.id} | Status: ${orderDetails.status?.toUpperCase() || 'COMPLETED'}`, 60, orderBoxY + 10);

      doc.y = orderBoxY + 35;
      doc.moveDown(1);

      // Property Information Section
      addSection(doc, 'PROPERTY INFORMATION', '#3b82f6');
      
      const address = property?.address || orderDetails.propertyAddress || 'Not specified';
      addInfoRow(doc, 'Property Address:', address);
      
      if (property?.suburb) addInfoRow(doc, 'Suburb:', property.suburb);
      if (property?.city) addInfoRow(doc, 'City/Region:', property.city);
      if (property?.propertyType) addInfoRow(doc, 'Property Type:', capitalizeWords(property.propertyType));
      
      doc.moveDown(1.5);

      // LINZ Title Information Section
      if (linzData) {
        addSection(doc, 'OFFICIAL LINZ TITLE DATA', '#10b981');
        
        addInfoRow(doc, 'Title Number:', linzData.titleNumber || 'Not available');
        addInfoRow(doc, 'Land District:', linzData.landDistrict || 'Not available');
        addInfoRow(doc, 'Title Type:', linzData.type || 'Not available');
        addInfoRow(doc, 'Title Status:', linzData.status || 'Not available');
        
        if (linzData.issueDate) {
          addInfoRow(doc, 'Issue Date:', new Date(linzData.issueDate).toLocaleDateString('en-NZ'));
        }
        
        if (linzData.area) {
          addInfoRow(doc, 'Land Area:', `${parseFloat(linzData.area).toLocaleString('en-NZ')} m²`);
        }

        doc.moveDown(1);

        // Legal Description
        if (linzData.legalDescription) {
          doc
            .fillColor('#10b981')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('LEGAL DESCRIPTION');

          doc
            .moveDown(0.5)
            .strokeColor('#10b981')
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke()
            .moveDown(0.5);

          doc
            .fillColor('#333')
            .fontSize(10)
            .font('Helvetica')
            .text(linzData.legalDescription, { width: 495, align: 'justify' });

          doc.moveDown(1.5);
        }
      } else {
        // No LINZ data available
        addSection(doc, 'TITLE INFORMATION', '#f59e0b');
        
        doc
          .fillColor('#fef3c7')
          .rect(50, doc.y, 495, 80)
          .fill();

        doc
          .fillColor('#92400e')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('LINZ Data Not Available', 60, doc.y - 70);

        doc
          .fillColor('#78350f')
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Official LINZ title data could not be retrieved for this property at the time of report generation. This may be due to the property being newly registered or located outside the LINZ coverage area.',
            60,
            doc.y + 10,
            { width: 475, align: 'justify' }
          );

        doc.moveDown(4);
      }

      // Property Details from User
      if (property) {
        addSection(doc, 'PROPERTY DETAILS', '#8b5cf6');
        
        if (property.bedrooms) addInfoRow(doc, 'Bedrooms:', property.bedrooms.toString());
        if (property.bathrooms) addInfoRow(doc, 'Bathrooms:', property.bathrooms.toString());
        if (property.carSpaces) addInfoRow(doc, 'Car Spaces:', property.carSpaces.toString());
        if (property.floorArea) addInfoRow(doc, 'Floor Area:', `${property.floorArea} m²`);
        if (property.landArea) addInfoRow(doc, 'Land Area:', `${property.landArea} m²`);
        if (property.zoning) addInfoRow(doc, 'Zoning:', property.zoning);
        if (property.yearBuilt) addInfoRow(doc, 'Year Built:', property.yearBuilt.toString());

        doc.moveDown(1.5);
      }

      // Important Notes Section
      addSection(doc, 'IMPORTANT NOTES', '#ef4444');

      const notes = [
        'This report is generated from official LINZ (Land Information New Zealand) data where available.',
        'Title information is current as of the generation date shown above.',
        'This report is for informational purposes only and does not constitute legal advice.',
        'Always consult with a qualified conveyancer or solicitor before making property decisions.',
        'LINZ data may not reflect very recent changes or pending transactions.',
        'For official title documents with full ownership details, please order from LINZ directly.'
      ];

      doc
        .fillColor('#333')
        .fontSize(9)
        .font('Helvetica');

      notes.forEach((note, index) => {
        doc.text(`${index + 1}. ${note}`, { width: 495, align: 'justify' });
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Footer
      doc
        .fontSize(8)
        .fillColor('#999')
        .text('─'.repeat(80), { align: 'center' })
        .moveDown(0.5)
        .text(`Generated by HouseMatch Property Platform | ${new Date().toISOString()}`, { align: 'center' })
        .text(`Report ID: ${orderDetails.id}`, { align: 'center' })
        .text('For support, visit housematch.nz or email info@swiperight.nz', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper function to add a section header
 */
function addSection(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc
    .fillColor(color)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title);

  doc
    .moveDown(0.5)
    .strokeColor(color)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(0.5);
}

/**
 * Helper function to add an info row
 */
function addInfoRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc
    .fillColor('#333')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(label, 50, y, { width: 180, continued: false });
  doc
    .font('Helvetica')
    .text(value, 240, y, { width: 305 });
  doc.moveDown(0.4);
}

/**
 * Helper function to capitalize words
 */
function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}
