/**
 * Title Search PDF Generator Service
 * Generates white-labeled PDF reports for Title Search orders
 * Includes LINZ data formatting and professional layout
 */

import PDFDocument from 'pdfkit';

export interface TitleSearchPDFData {
  orderNumber: string;
  propertyAddress: string;
  titleNumber: string;
  
  // LINZ Data
  linzData: {
    titleNumber: string;
    landDistrict: string;
    legalDescription: string;
    titleType: string;
    titleStatus: string;
    issueDate: string | null;
    area: number | null;
  };
  
  // Customer info
  customerName: string;
  customerEmail: string;
  
  // Report metadata
  generatedDate: Date;
  deliveryDate: Date;
}

class TitleSearchPDFService {
  /**
   * Generate a Title Search PDF report
   * Returns PDF as Buffer for email attachment
   */
  async generatePDF(data: TitleSearchPDFData): Promise<Buffer> {
    console.log('📄 Generating Title Search PDF for:', data.propertyAddress);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header with branding
        this.addHeader(doc);
        
        // Report title
        doc.moveDown(2);
        doc.fontSize(20)
          .fillColor('#1e40af')
          .text('Property Title Search Report', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
          .fillColor('#6b7280')
          .text(`Order #${data.orderNumber}`, { align: 'center' });
        
        // Property details section
        doc.moveDown(2);
        this.addSection(doc, '📍 Property Details');
        this.addField(doc, 'Address', data.propertyAddress);
        this.addField(doc, 'Title Number', data.titleNumber);
        this.addField(doc, 'Report Generated', data.generatedDate.toLocaleString('en-NZ'));
        
        // LINZ Title Information
        doc.moveDown(1.5);
        this.addSection(doc, '📄 Title Information (LINZ Verified)');
        this.addField(doc, 'Title Number', data.linzData.titleNumber);
        this.addField(doc, 'Land District', data.linzData.landDistrict);
        this.addField(doc, 'Title Type', data.linzData.titleType);
        this.addField(doc, 'Title Status', data.linzData.titleStatus);
        
        if (data.linzData.issueDate) {
          this.addField(doc, 'Issue Date', data.linzData.issueDate);
        }
        
        if (data.linzData.area) {
          this.addField(doc, 'Land Area', `${data.linzData.area.toLocaleString()} m²`);
        }
        
        // Legal description
        doc.moveDown(1.5);
        this.addSection(doc, '📋 Legal Description');
        doc.fontSize(10)
          .fillColor('#374151')
          .text(data.linzData.legalDescription, {
            align: 'left',
            width: 495,
          });
        
        // Important notice section
        doc.moveDown(2);
        this.addNoticeBox(doc);
        
        // Footer
        this.addFooter(doc, data);
        
        doc.end();

      } catch (error) {
        console.error('❌ Error generating PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Add branded header to PDF
   */
  private addHeader(doc: PDFKit.PDFDocument): void {
    doc.fontSize(24)
      .fillColor('#1e40af')
      .text('HouseMatch.nz', 50, 50);
    
    doc.fontSize(10)
      .fillColor('#6b7280')
      .text('Property Intelligence Platform', 50, 80);
    
    // Horizontal line
    doc.moveTo(50, 100)
      .lineTo(545, 100)
      .strokeColor('#e5e7eb')
      .stroke();
  }

  /**
   * Add section heading
   */
  private addSection(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(14)
      .fillColor('#1e40af')
      .text(title, { underline: false });
    
    doc.moveDown(0.5);
  }

  /**
   * Add field with label and value
   */
  private addField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    const currentY = doc.y;
    
    doc.fontSize(10)
      .fillColor('#6b7280')
      .text(`${label}:`, 50, currentY, { width: 150, continued: false });
    
    doc.fontSize(10)
      .fillColor('#111827')
      .text(value, 210, currentY);
    
    doc.moveDown(0.7);
  }

  /**
   * Add notice/disclaimer box
   */
  private addNoticeBox(doc: PDFKit.PDFDocument): void {
    const boxY = doc.y;
    
    // Background box
    doc.rect(50, boxY, 495, 80)
      .fillAndStroke('#fef3c7', '#f59e0b');
    
    // Notice text
    doc.fontSize(10)
      .fillColor('#92400e')
      .text('📋 IMPORTANT NOTICE', 60, boxY + 10, { underline: true });
    
    doc.moveDown(0.3);
    doc.fontSize(9)
      .fillColor('#78350f')
      .text(
        'This report contains basic title information from LINZ (Land Information New Zealand). ' +
        'For complete ownership details including current proprietors, encumbrances, mortgages, ' +
        'and easements, you may need to purchase the full Certificate of Title from LINZ.',
        60,
        doc.y,
        { width: 475, align: 'left' }
      );
  }

  /**
   * Add footer with metadata
   */
  private addFooter(doc: PDFKit.PDFDocument, data: TitleSearchPDFData): void {
    const pageHeight = doc.page.height;
    
    doc.fontSize(8)
      .fillColor('#9ca3af')
      .text(
        `Generated for: ${data.customerName} (${data.customerEmail})`,
        50,
        pageHeight - 80,
        { align: 'left' }
      );
    
    doc.text(
      `Report delivered: ${data.deliveryDate.toLocaleString('en-NZ')}`,
      50,
      pageHeight - 65,
      { align: 'left' }
    );
    
    doc.text(
      'Powered by LINZ | HouseMatch.nz | info@swiperight.nz',
      50,
      pageHeight - 50,
      { align: 'center' }
    );
  }

  /**
   * Generate filename for the PDF
   */
  generateFilename(titleNumber: string): string {
    const sanitized = titleNumber.replace(/[^a-zA-Z0-9]/g, '_');
    return `PropertyTitleSearch_${sanitized}.pdf`;
  }
}

export const titleSearchPDFService = new TitleSearchPDFService();
