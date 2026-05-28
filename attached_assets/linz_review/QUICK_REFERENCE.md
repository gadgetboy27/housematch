# 🚀 Quick Reference - LINZ Property Verification

## API Key
```
3abe02a0a5a74f94a1c143ac557467ff
```

---

## 📊 Key Endpoints

### 1. Search Address → Get Coordinates
```
GET https://data.linz.govt.nz/services;key=3abe02a0a5a74f94a1c143ac557467ff/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-105689&cql_filter=full_address LIKE '%ADDRESS%' AND town_city='CITY'&count=1&outputFormat=json
```

**Returns:** Coordinates [lon, lat]

### 2. Get Title from Coordinates
```
GET https://data.linz.govt.nz/services/query/v1/vector.json?key=3abe02a0a5a74f94a1c143ac557467ff&layer=50804&x=LON&y=LAT&radius=50&max_results=1
```

**Returns:** Title number, lot number, legal description

---

## 💻 TypeScript Quick Snippets

### Basic API Call
```typescript
const result = await linzApi.getPropertyVerification(
  '123 Queen Street',
  'Auckland'
);

if ('error' in result) {
  console.error(result.error);
} else {
  console.log(result.titleNumber);  // "NA123/456"
  console.log(result.lotNumber);    // "Lot 1 DP 12345"
}
```

### Component Usage
```tsx
<PropertyVerification 
  onVerificationComplete={(result) => {
    // Do something with result
    console.log(result.titleNumber);
  }}
/>
```

### Direct Service Call
```typescript
import { linzApi } from './services/linzApi.service';

const verify = async () => {
  const data = await linzApi.getPropertyVerification(address, city);
  return data;
};
```

---

## 📦 What You Get (FREE)

✅ **Title Number** - e.g., "NA123/456"
✅ **Lot Number** - e.g., "Lot 5 DP 12345"
✅ **Legal Description** - Full text
✅ **Title Type** - Freehold/Leasehold/Unit
✅ **Status** - Current/Historic
✅ **Coordinates** - lat/lon
✅ **Full Address** - Verified address

❌ **NOT Available:** Owner names (requires separate license)

---

## 🎯 Layer IDs

| Name | Layer ID | Use |
|------|----------|-----|
| Property Titles | 50804 | Title info |
| Street Addresses | 105689 | Address search |
| Parcels | 50772 | Boundaries |

---

## 🔑 Type Interfaces

```typescript
interface PropertyVerificationResult {
  success: boolean;
  titleNumber: string;
  legalDescription: string;
  lotNumber: string;
  titleType: string;
  status: string;
  fullAddress?: string;
  coordinates?: { lat: number; lon: number };
}

interface ApiError {
  error: string;
  message?: string;
}
```

---

## 🚨 Error Handling

```typescript
const result = await linzApi.getPropertyVerification(address, city);

if ('error' in result) {
  // Handle error
  switch (result.error) {
    case 'Address not found':
      // Show address error
      break;
    case 'No title found':
      // Show title error
      break;
    case 'System error':
      // Show system error
      break;
  }
} else {
  // Success! Use result.titleNumber, result.lotNumber, etc.
}
```

---

## 📱 NZ Cities List

```typescript
const NZ_CITIES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton',
  'Tauranga', 'Lower Hutt', 'Dunedin', 'Palmerston North',
  'Napier', 'Porirua', 'Hibiscus Coast', 'New Plymouth',
  'Rotorua', 'Whangarei', 'Nelson', 'Hastings', 'Invercargill'
];
```

---

## 🎨 Import Statements

```typescript
// Component
import PropertyVerification from './components/PropertyVerification';
import './components/PropertyVerification.css';

// Service
import { linzApi } from './services/linzApi.service';
import type { 
  PropertyVerificationResult, 
  ApiError 
} from './services/linzApi.service';
```

---

## ⚡ Common Patterns

### Pattern 1: Form Integration
```tsx
const [propertyData, setPropertyData] = useState(null);

<PropertyVerification 
  onVerificationComplete={(result) => {
    setPropertyData({
      titleNumber: result.titleNumber,
      lotNumber: result.lotNumber,
      verified: true
    });
  }}
/>
```

### Pattern 2: Manual Trigger
```tsx
const verifyProperty = async () => {
  const result = await linzApi.getPropertyVerification(
    formData.address,
    formData.city
  );
  
  if ('success' in result) {
    updateForm(result);
  }
};

<button onClick={verifyProperty}>Verify</button>
```

### Pattern 3: Order Title Button
```tsx
const orderTitle = () => {
  window.open(
    linzApi.getLandRecordSearchUrl(titleNumber),
    '_blank'
  );
};
```

---

## 🧪 Test Addresses

```typescript
// Test with these real addresses:
const testData = [
  { address: '1 Queen Street', city: 'Auckland' },
  { address: 'Sky Tower', city: 'Auckland' },
  { address: 'Parliament Buildings', city: 'Wellington' },
];
```

---

## 📝 Attribution (Required!)

```html
<p>
  Property data sourced from 
  <a href="https://data.linz.govt.nz">LINZ Data Service</a> 
  and licensed for reuse under 
  <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
</p>
```

---

## 🔍 Regex Patterns

```typescript
// Extract lot number
const lotMatch = text.match(/LOT\s+(\d+)/i);
const dpMatch = text.match(/DP\s+(\d+)/i);

// Validate title number format
const titlePattern = /^[A-Z]{2,3}\d+[A-Z]?\/\d+$/i;
const isValid = titlePattern.test('NA123/456'); // true
```

---

## 💾 Local Storage (Optional)

```typescript
// Cache results to avoid repeated API calls
const cacheResult = (address: string, result: any) => {
  localStorage.setItem(
    `linz_${address}`,
    JSON.stringify({ result, timestamp: Date.now() })
  );
};

const getCachedResult = (address: string) => {
  const cached = localStorage.getItem(`linz_${address}`);
  if (!cached) return null;
  
  const { result, timestamp } = JSON.parse(cached);
  const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24h
  
  return isExpired ? null : result;
};
```

---

## 🎯 Workflow Summary

```
1. User enters address + city
2. Call linzApi.getPropertyVerification()
3. Display title number + lot number
4. User clicks "Order Full Title"
5. Open LINZ website ($8, not your problem)
```

---

## ⚠️ Important Notes

- ✅ API key is PUBLIC - it's meant to be visible
- ✅ No rate limits for normal use
- ✅ Commercial use allowed (with attribution)
- ❌ Can't get owner names without special license
- ❌ Can't order titles via API (web only)

---

## 🔗 Useful Links

- **LINZ Data Service:** https://data.linz.govt.nz
- **Land Record Search:** https://lrs.linz.govt.nz
- **API Docs:** https://www.linz.govt.nz/guidance/data-service/linz-data-service-guide
- **Support:** linzdataservice@linz.govt.nz

---

**That's it!** Use the files provided and you're ready to go! 🚀
