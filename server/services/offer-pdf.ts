import PDFDocument from 'pdfkit';

/**
 * Generate PDF for Express Interest offer
 */
export async function generateExpressInterestPDF(offer: any, property: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Express Interest Form',
          Author: 'HouseMatch Property Platform',
          Subject: `Property Interest - ${property.address}`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with branding
      doc
        .fillColor('#667eea')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('EXPRESS INTEREST FORM', { align: 'center' });

      doc
        .moveDown(0.5)
        .fillColor('#666')
        .fontSize(10)
        .font('Helvetica')
        .text('HouseMatch Property Platform', { align: 'center' })
        .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
        .moveDown(1);

      // Offer ID box
      const offerBoxY = doc.y;
      doc
        .fillColor('#f0f8ff')
        .rect(50, offerBoxY, 495, 30)
        .fill()
        .fillColor('#667eea')
        .fontSize(10)
        .text(`Offer ID: ${offer.id}`, 60, offerBoxY + 10);

      doc.y = offerBoxY + 35;
      doc.moveDown(1);

      // Property Details Section
      doc
        .fillColor('#667eea')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('PROPERTY DETAILS');

      doc
        .moveDown(0.5)
        .strokeColor('#667eea')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.5);

      doc
        .fillColor('#333')
        .fontSize(11)
        .font('Helvetica');

      addInfoRow(doc, 'Address:', property.address);
      addInfoRow(doc, 'Suburb:', property.suburb);
      if (offer.propertyLotNumber) addInfoRow(doc, 'Lot Number:', offer.propertyLotNumber);
      if (offer.propertyCertificateOfTitle) addInfoRow(doc, 'Certificate of Title:', offer.propertyCertificateOfTitle);
      if (offer.propertyZoning) addInfoRow(doc, 'Zoning:', offer.propertyZoning);
      if (offer.propertyLandArea) addInfoRow(doc, 'Land Area:', `${offer.propertyLandArea}m²`);

      doc.moveDown(1.5);

      // Offer Details Section
      doc
        .fillColor('#667eea')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('OFFER DETAILS');

      doc
        .moveDown(0.5)
        .strokeColor('#667eea')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.5);

      // Highlight the offer price
      const priceBoxY = doc.y;
      doc
        .fillColor('#e8f4f8')
        .rect(50, priceBoxY, 495, 40)
        .fill();

      doc
        .fillColor('#667eea')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Offer Price:', 60, priceBoxY + 12, { continued: true })
        .text(`  $${offer.offerPrice}`, { align: 'left' });

      doc.y = priceBoxY + 50;
      doc.fillColor('#333').fontSize(11).font('Helvetica');

      if (offer.settlementPeriod) addInfoRow(doc, 'Settlement Period:', offer.settlementPeriod);
      if (offer.financeCondition !== undefined) addInfoRow(doc, 'Finance Condition:', offer.financeCondition ? '✓ Yes' : '✗ No');
      if (offer.buildingInspectionCondition !== undefined) addInfoRow(doc, 'Building Inspection:', offer.buildingInspectionCondition ? '✓ Yes' : '✗ No');
      if (offer.limCondition !== undefined) addInfoRow(doc, 'LIM Report Condition:', offer.limCondition ? '✓ Yes' : '✗ No');

      doc.moveDown(1.5);

      // Buyer Information Section
      doc
        .fillColor('#667eea')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('BUYER INFORMATION');

      doc
        .moveDown(0.5)
        .strokeColor('#667eea')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.5);

      doc.fillColor('#333').fontSize(11).font('Helvetica');

      addInfoRow(doc, 'Name:', offer.buyerName);
      addInfoRow(doc, 'Email:', offer.buyerEmail);
      addInfoRow(doc, 'Phone:', offer.buyerPhone);

      if (offer.additionalConditions || offer.additionalComments) {
        doc.moveDown(1.5);

        doc
          .fillColor('#667eea')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('ADDITIONAL INFORMATION');

        doc
          .moveDown(0.5)
          .strokeColor('#667eea')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke()
          .moveDown(0.5);

        doc.fillColor('#333').fontSize(11).font('Helvetica');

        if (offer.additionalConditions) {
          doc.font('Helvetica-Bold').text('Additional Conditions:', { continued: false });
          doc.font('Helvetica').text(offer.additionalConditions);
          doc.moveDown(0.5);
        }

        if (offer.additionalComments) {
          doc.font('Helvetica-Bold').text('Comments:', { continued: false });
          doc.font('Helvetica').text(offer.additionalComments);
        }
      }

      // Footer with legal notice
      doc.moveDown(2);
      doc
        .fillColor('#f9f9f9')
        .rect(50, doc.y, 495, 100)
        .fill()
        .fillColor('#666')
        .fontSize(9)
        .font('Helvetica')
        .text(
          'LEGAL NOTICE: This document contains an expression of interest to purchase real estate. This is a non-binding inquiry unless otherwise stated in writing. Both parties are encouraged to seek independent legal and financial advice before proceeding with any transaction.',
          60,
          doc.y - 90,
          { width: 475, align: 'justify' }
        );

      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(`Generated by HouseMatch Property Platform | ${new Date().toISOString()}`, { align: 'center' })
        .text(`Document ID: ${offer.id}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF for Official ADLS-compliant offer
 */
export async function generateMakeOfferPDF(
  offer: any,
  property: any,
  buyerDetails?: any,
  conditions?: any[],
  chattels?: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Official Property Offer (ADLS-Compliant)',
          Author: 'HouseMatch Property Platform',
          Subject: `Property Purchase Offer - ${property.address}`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with ADLS badge
      doc
        .fillColor('#11998e')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('OFFICIAL PROPERTY OFFER', { align: 'center' });

      doc
        .moveDown(0.3)
        .fillColor('#38ef7d')
        .fontSize(12)
        .text('ADLS-COMPLIANT AGREEMENT', { align: 'center' });

      doc
        .moveDown(0.5)
        .fillColor('#666')
        .fontSize(10)
        .font('Helvetica')
        .text('Sale and Purchase Agreement (11th Edition 2022)', { align: 'center' })
        .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
        .moveDown(1);

      // Offer ID box
      const makeOfferBoxY = doc.y;
      doc
        .fillColor('#e8f8f5')
        .rect(50, makeOfferBoxY, 495, 30)
        .fill()
        .fillColor('#11998e')
        .fontSize(10)
        .text(`Offer ID: ${offer.id} | Status: ${offer.status?.toUpperCase() || 'PENDING'}`, 60, makeOfferBoxY + 10);

      doc.y = makeOfferBoxY + 35;
      doc.moveDown(1);

      // Property Details Section
      addSection(doc, 'PROPERTY DETAILS', '#11998e');
      addInfoRow(doc, 'Address:', property.address);
      addInfoRow(doc, 'Suburb:', property.suburb);
      if (offer.propertyLotNumber) addInfoRow(doc, 'Lot Number:', offer.propertyLotNumber);
      if (offer.propertyCertificateOfTitle) addInfoRow(doc, 'Certificate of Title:', offer.propertyCertificateOfTitle);
      if (offer.propertyZoning) addInfoRow(doc, 'Zoning:', offer.propertyZoning);
      if (offer.propertyLandArea) addInfoRow(doc, 'Land Area:', `${offer.propertyLandArea}m²`);
      if (offer.propertyFloorArea) addInfoRow(doc, 'Floor Area:', `${offer.propertyFloorArea}m²`);

      doc.moveDown(1.5);

      // Financial Terms Section
      addSection(doc, 'FINANCIAL TERMS', '#11998e');

      const priceBoxY = doc.y;
      doc
        .fillColor('#e8f8f5')
        .rect(50, priceBoxY, 495, 40)
        .fill();

      doc
        .fillColor('#11998e')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Purchase Price:', 60, priceBoxY + 12, { continued: true })
        .text(`  $${offer.offerPrice}`, { align: 'left' });

      doc.y = priceBoxY + 50;
      doc.fillColor('#333').fontSize(11).font('Helvetica');

      if (offer.depositAmount) addInfoRow(doc, 'Deposit Amount:', `$${offer.depositAmount}`);
      if (offer.depositPaymentDate) addInfoRow(doc, 'Deposit Payment Date:', new Date(offer.depositPaymentDate).toLocaleDateString());
      if (offer.settlementDate) addInfoRow(doc, 'Settlement Date:', new Date(offer.settlementDate).toLocaleDateString());

      doc.moveDown(1.5);

      // Buyer Information Section
      addSection(doc, 'BUYER INFORMATION', '#11998e');
      addInfoRow(doc, 'Name:', offer.buyerName);
      addInfoRow(doc, 'Email:', offer.buyerEmail);
      addInfoRow(doc, 'Phone:', offer.buyerPhone);

      if (buyerDetails) {
        doc.moveDown(0.5);
        if (buyerDetails.buyerOccupation) addInfoRow(doc, 'Occupation:', buyerDetails.buyerOccupation);
        
        if (buyerDetails.hasSolicitor && buyerDetails.solicitorName) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').text('Solicitor/Conveyancer Details:');
          doc.font('Helvetica');
          if (buyerDetails.solicitorName) addInfoRow(doc, '  Name:', buyerDetails.solicitorName);
          if (buyerDetails.solicitorFirm) addInfoRow(doc, '  Firm:', buyerDetails.solicitorFirm);
          if (buyerDetails.solicitorEmail) addInfoRow(doc, '  Email:', buyerDetails.solicitorEmail);
          if (buyerDetails.solicitorPhone) addInfoRow(doc, '  Phone:', buyerDetails.solicitorPhone);
          if (buyerDetails.solicitorAddress) addInfoRow(doc, '  Address:', buyerDetails.solicitorAddress);
        }
      }

      // Conditions Section
      if (conditions && conditions.length > 0) {
        doc.moveDown(1.5);
        addSection(doc, 'CONDITIONS OF SALE', '#11998e');
        
        conditions.forEach((condition, index) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. ${condition.conditionType.replace(/_/g, ' ').toUpperCase()}`);
          doc.font('Helvetica').text(`   ${condition.description}`);
          doc.text(`   Days to Satisfy: ${condition.daysToSatisfy} days | Due Date: ${new Date(condition.dueDate).toLocaleDateString()}`);
          doc.moveDown(0.5);
        });
      }

      // Chattels Section
      if (chattels) {
        doc.moveDown(1.5);
        addSection(doc, 'CHATTELS', '#11998e');

        if (chattels.included && chattels.included.length > 0) {
          doc.font('Helvetica-Bold').text('Included in Sale:');
          doc.font('Helvetica');
          chattels.included.forEach((item: string) => {
            doc.text(`  • ${item}`);
          });
          doc.moveDown(0.5);
        }

        if (chattels.excluded && chattels.excluded.length > 0) {
          doc.font('Helvetica-Bold').text('Excluded from Sale:');
          doc.font('Helvetica');
          chattels.excluded.forEach((item: string) => {
            doc.text(`  • ${item}`);
          });
        }
      }

      // Add a new page for legal notice
      doc.addPage();

      // Legal Notice Section
      doc
        .fillColor('#11998e')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('IMPORTANT LEGAL NOTICE', { align: 'center' });

      doc
        .moveDown(1)
        .fillColor('#333')
        .fontSize(11)
        .font('Helvetica')
        .text(
          'This document constitutes a legally binding offer to purchase real estate under the ADLS Sale and Purchase Agreement (11th Edition 2022). ',
          { align: 'justify' }
        );

      doc
        .moveDown(0.5)
        .font('Helvetica-Bold')
        .text('Key Points:')
        .font('Helvetica')
        .text('• This offer becomes a binding contract upon acceptance by the vendor')
        .text('• All parties must seek independent legal and financial advice')
        .text('• Conditions must be satisfied within the specified timeframes')
        .text('• Deposit must be paid to stakeholder as specified')
        .text('• Settlement date is subject to the terms and conditions outlined')
        .moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text('Parties\' Obligations:')
        .font('Helvetica')
        .text('• Buyer: Pay deposit, satisfy all conditions, settle on specified date')
        .text('• Vendor: Provide clear title, meet all disclosure requirements')
        .text('• Both Parties: Act in good faith, cooperate in the transaction')
        .moveDown(0.5);

      doc
        .fillColor('#ff6b6b')
        .font('Helvetica-Bold')
        .text('PROFESSIONAL ADVICE REQUIRED:', { align: 'center' })
        .fillColor('#333')
        .font('Helvetica')
        .text(
          'Before signing or accepting this offer, consult with your solicitor and financial advisor. Property transactions involve significant legal and financial commitments.',
          { align: 'justify' }
        );

      // Footer on legal page
      doc.moveDown(2);
      doc
        .fillColor('#f9f9f9')
        .rect(50, doc.y, 495, 80)
        .fill()
        .fillColor('#666')
        .fontSize(9)
        .font('Helvetica')
        .text(
          'This offer document was generated by HouseMatch Property Platform using ADLS-compliant templates. While every effort is made to ensure accuracy, this platform does not provide legal advice. All parties must obtain independent legal representation.',
          60,
          doc.y - 70,
          { width: 475, align: 'justify' }
        );

      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(`Generated by HouseMatch Property Platform | ${new Date().toISOString()}`, { align: 'center' })
        .text(`Document ID: ${offer.id}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to add section headers
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

  doc.fillColor('#333').fontSize(11).font('Helvetica');
}

// Helper function to add info rows
function addInfoRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc
    .font('Helvetica-Bold')
    .text(label, 50, y, { width: 150, continued: false });
  doc
    .font('Helvetica')
    .text(value, 210, y, { width: 335 });
  doc.moveDown(0.3);
}
