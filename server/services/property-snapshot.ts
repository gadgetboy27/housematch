/**
 * Free Property Snapshot Service
 * Generates instant basic property reports using free LINZ data
 * Used for building rapport and lead generation before upselling to paid reports
 */

import { linzApi } from './linz-api.js';

export interface PropertySnapshotData {
  success: boolean;
  property: {
    address: string;
    fullAddress?: string;
    titleNumber?: string;
    titleType?: string;
    titleStatus?: string;
    landArea?: string;
    issueDate?: string;
    legalDescription?: string;
    landDistrict?: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  isVerified: boolean;
  verificationDate: string;
  error?: string;
  message?: string;
}

class PropertySnapshotService {
  /**
   * Generate a free property snapshot using LINZ verification
   */
  async generateSnapshot(address: string, city: string): Promise<PropertySnapshotData> {
    console.log('📸 Generating property snapshot for:', { address, city });

    try {
      // Use our new LINZ verification to get basic property data
      const linzData = await linzApi.verifyPropertyAddress(address, city);

      if (!linzData.success) {
        return {
          success: false,
          property: {
            address: `${address}, ${city}`,
          },
          isVerified: false,
          verificationDate: new Date().toISOString(),
          error: linzData.error,
          message: linzData.message || 'Property could not be verified with LINZ',
        };
      }

      // Format the snapshot data
      const snapshot: PropertySnapshotData = {
        success: true,
        property: {
          address: `${address}, ${city}`,
          fullAddress: linzData.fullAddress,
          titleNumber: linzData.titleNumber,
          titleType: linzData.titleType,
          titleStatus: linzData.status,
          landArea: linzData.legalDescription?.includes('m²') 
            ? linzData.legalDescription.match(/(\d+(?:\.\d+)?)\s*m²/)?.[0]
            : undefined,
          issueDate: (linzData as any).issueDate,
          legalDescription: linzData.legalDescription,
          landDistrict: (linzData as any).landDistrict,
          coordinates: linzData.coordinates,
        },
        isVerified: true,
        verificationDate: new Date().toISOString(),
      };

      console.log('✅ Property snapshot generated successfully');
      return snapshot;

    } catch (error: any) {
      console.error('❌ Error generating property snapshot:', error);
      return {
        success: false,
        property: {
          address: `${address}, ${city}`,
        },
        isVerified: false,
        verificationDate: new Date().toISOString(),
        error: 'System error',
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Format snapshot data for display (text format for emails/PDFs)
   */
  formatSnapshotText(snapshot: PropertySnapshotData): string {
    if (!snapshot.success || !snapshot.isVerified) {
      return `
🏠 Property Snapshot - FREE
━━━━━━━━━━━━━━━━━━━━
❌ Property Not Verified

Address: ${snapshot.property.address}
Status: Unable to verify with LINZ

${snapshot.message || 'This property could not be found in the LINZ database.'}

Want to search manually? Try our Full Title Search ($19)
`.trim();
    }

    const { property } = snapshot;
    
    return `
🏠 Property Snapshot - FREE
✅ LINZ Verified
━━━━━━━━━━━━━━━━━━━━

📍 Address: ${property.fullAddress || property.address}
${property.titleNumber ? `📄 Title: ${property.titleNumber}` : ''}
${property.titleType ? `🏛️ Type: ${property.titleType}` : ''}
${property.titleStatus ? `📊 Status: ${property.titleStatus}` : ''}
${property.landArea ? `📏 Land Area: ${property.landArea}` : ''}
${property.issueDate ? `🗓️ Issue Date: ${property.issueDate}` : ''}
${property.legalDescription ? `📋 Legal: ${property.legalDescription}` : ''}

━━━━━━━━━━━━━━━━━━━━
Want more details?

→ Full Title Search ($19) includes:
  • Current registered owner names
  • All mortgages and liens
  • Easements and covenants
  • Full legal documentation
  • Delivered in 2 business days

This is a basic property verification. For complete ownership and encumbrance details, 
order a Full Title Search Report.

Verified: ${new Date(snapshot.verificationDate).toLocaleString('en-NZ')}
Powered by LINZ (Land Information New Zealand)
`.trim();
  }
}

export const propertySnapshotService = new PropertySnapshotService();
