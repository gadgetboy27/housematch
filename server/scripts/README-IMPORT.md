# Trade Me Property Import Guide

## 🎯 Purpose

This script legally imports properties from Trade Me API to populate your HouseMatch database.

## 📋 Prerequisites

You need Trade Me API credentials. If you don't have them:

1. Go to: https://www.trademe.co.nz/MyTradeMe/Api/MyApplications.aspx
2. Create a new application
3. Get your Consumer Key and Consumer Secret
4. Add them to your Replit Secrets:
   - `TRADEME_CONSUMER_KEY`
   - `TRADEME_CONSUMER_SECRET`

## 🚀 Usage

### Run the import script:

```bash
# Import 10 properties from Auckland (default)
npx tsx server/scripts/import-trademe-properties.ts

# Import 50 properties from Auckland
npx tsx server/scripts/import-trademe-properties.ts 50

# Import 20 properties from Wellington (region 2)
npx tsx server/scripts/import-trademe-properties.ts 20 2

# Import 30 properties from Christchurch (region 3)
npx tsx server/scripts/import-trademe-properties.ts 30 3
```

## 🗺️ Trade Me Region IDs

| Region ID | Location |
|-----------|----------|
| 1 | Auckland |
| 2 | Wellington |
| 3 | Canterbury (Christchurch) |
| 4 | Waikato (Hamilton) |
| 5 | Bay of Plenty (Tauranga) |
| 6 | Gisborne |
| 7 | Hawke's Bay |
| 8 | Taranaki |
| 9 | Manawatu / Wanganui |
| 10 | Northland |
| 11 | Otago |
| 12 | Southland |
| 13 | Tasman |
| 14 | Nelson |
| 15 | Marlborough |
| 16 | West Coast |

## 📊 What Gets Imported

The script imports:
- ✅ Property titles and descriptions
- ✅ Addresses (suburb and region)
- ✅ Prices
- ✅ Bedrooms & bathrooms
- ✅ Floor area & land area
- ✅ Property type (residential/rental/commercial)
- ✅ Main property image
- ✅ Trade Me listing ID (for deduplication)

## 🔒 Legal & Ethical

This script uses the **official Trade Me API** which means:
- ✅ Legal and compliant with Terms of Service
- ✅ Properly rate-limited
- ✅ Licensed data usage
- ✅ No web scraping
- ✅ Respects Trade Me's guidelines

## 🛡️ Deduplication

The script automatically:
- Checks for duplicate imports (by Trade Me listing ID)
- Skips properties already in the database
- Safe to run multiple times

## 🎨 Generated Data

**System User:** Properties are imported under a system user (`system@housematch.co.nz`) with Premium tier to avoid limits.

**Lot Numbers:** Generated as `TM-{ListingID}` (e.g., `TM-123456789`)

**Certificate of Title:** Placeholder as `TRADEME-{ListingID}` (replace with real data later)

## ⚠️ Limitations

- **Images:** Only main image is imported (Trade Me API limitation)
- **Additional details:** Some property details may require additional API calls
- **Title data:** Certificate of Title is a placeholder and should be updated with real LINZ data

## 📝 Example Output

```
🚀 Trade Me Property Import Script
=====================================

📡 Testing Trade Me API connection...
✅ API Connection successful!
   Found 3 sample properties

👤 Setting up system user...
✅ Using existing system user: abc-123-def

🏠 Fetching 10 properties from Trade Me (Region 1)...
✅ Retrieved 10 properties

💾 Importing properties to database...

✅ [1/10] Imported: "Modern 3 Bedroom Home in Ponsonby"
   Location: Ponsonby, Auckland
   Price: $1,250,000
   Bedrooms: 3, Bathrooms: 2

✅ [2/10] Imported: "Beachfront Apartment with Ocean Views"
   Location: Mission Bay, Auckland
   Price: $850,000
   Bedrooms: 2, Bathrooms: 1

[...]

=====================================
📊 Import Summary
=====================================
✅ Successfully imported: 10 properties

🎉 Import complete!
```

## 🆘 Troubleshooting

### "API Connection Failed"
- Check your `TRADEME_CONSUMER_KEY` and `TRADEME_CONSUMER_SECRET` in Replit Secrets
- Make sure your Trade Me application is approved

### "No properties found"
- Try a different region ID
- Check if your Trade Me API access includes property data
- Some regions may have fewer listings

### "Already imported" messages
- This is normal - the script skips duplicates
- Safe to run again if needed

## 🔄 Regular Updates

To keep your database fresh:
1. Run the script weekly/monthly
2. New listings will be added automatically
3. Existing listings are skipped

---

**Questions?** Check the Trade Me API docs: https://developer.trademe.co.nz/
