import { useEffect } from 'react';

interface LocalBusinessSchema {
  type: 'LocalBusiness';
  name: string;
  description?: string;
  url?: string;
  telephone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceRange?: string;
}

interface ProductSchema {
  type: 'Product';
  name: string;
  description: string;
  offers: {
    price: string;
    priceCurrency: string;
    availability?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

interface RealEstateListingSchema {
  type: 'RealEstateListing';
  name: string;
  description: string;
  url: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  numberOfRooms?: number;
  numberOfBedrooms?: number;
  numberOfBathroomsTotal?: number;
  floorSize?: {
    value: number;
    unitCode: string;
  };
}

type StructuredDataProps = LocalBusinessSchema | ProductSchema | RealEstateListingSchema;

export function StructuredData(props: StructuredDataProps) {
  useEffect(() => {
    let schema: any = {
      "@context": "https://schema.org",
    };

    if (props.type === 'LocalBusiness') {
      schema = {
        ...schema,
        "@type": "RealEstateAgent",
        "name": props.name,
        "description": props.description || "Property discovery and real estate services in New Zealand",
        "url": props.url || "https://housematch.nz",
        "areaServed": {
          "@type": "Country",
          "name": "New Zealand"
        },
        "priceRange": props.priceRange || "$$",
      };

      if (props.address) {
        schema.address = {
          "@type": "PostalAddress",
          ...props.address,
        };
      }

      if (props.geo) {
        schema.geo = {
          "@type": "GeoCoordinates",
          "latitude": props.geo.latitude,
          "longitude": props.geo.longitude,
        };
      }
    } else if (props.type === 'Product') {
      schema = {
        ...schema,
        "@type": "Service",
        "name": props.name,
        "description": props.description,
        "provider": {
          "@type": "Organization",
          "name": "HouseMatch NZ"
        },
        "offers": {
          "@type": "Offer",
          "price": props.offers.price,
          "priceCurrency": props.offers.priceCurrency,
          "availability": props.offers.availability || "https://schema.org/InStock",
        },
      };

      if (props.aggregateRating) {
        schema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": props.aggregateRating.ratingValue,
          "reviewCount": props.aggregateRating.reviewCount,
        };
      }
    } else if (props.type === 'RealEstateListing') {
      schema = {
        ...schema,
        "@type": "RealEstateListing",
        "name": props.name,
        "description": props.description,
        "url": props.url,
        "address": {
          "@type": "PostalAddress",
          ...props.address,
        },
      };

      if (props.geo) {
        schema.geo = {
          "@type": "GeoCoordinates",
          "latitude": props.geo.latitude,
          "longitude": props.geo.longitude,
        };
      }

      if (props.numberOfRooms) {
        schema.numberOfRooms = props.numberOfRooms;
      }

      if (props.numberOfBedrooms) {
        schema.numberOfBedrooms = props.numberOfBedrooms;
      }

      if (props.numberOfBathroomsTotal) {
        schema.numberOfBathroomsTotal = props.numberOfBathroomsTotal;
      }

      if (props.floorSize) {
        schema.floorSize = {
          "@type": "QuantitativeValue",
          "value": props.floorSize.value,
          "unitCode": props.floorSize.unitCode,
        };
      }
    }

    const scriptId = 'structured-data-' + props.type;
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }
    
    scriptElement.textContent = JSON.stringify(schema);

    return () => {
      const element = document.getElementById(scriptId);
      if (element) {
        element.remove();
      }
    };
  }, [props]);

  return null;
}

// Pre-configured structured data for HouseMatch business
export function HouseMatchBusinessData() {
  return (
    <StructuredData
      type="LocalBusiness"
      name="HouseMatch NZ"
      description="AI-powered property discovery platform for New Zealand. Swipe through homes, access property reports, and find your dream property with smart matching technology."
      url="https://housematch.nz"
      priceRange="Free - $$$"
      address={{
        streetAddress: "",
        addressLocality: "Auckland",
        addressRegion: "Auckland",
        addressCountry: "NZ"
      }}
    />
  );
}

// Property listing structured data generator
export function PropertyListingData({
  property
}: {
  property: {
    id: string;
    address: string;
    suburb: string;
    city: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    landArea?: number;
    floorArea?: number;
    latitude?: number;
    longitude?: number;
  }
}) {
  return (
    <StructuredData
      type="RealEstateListing"
      name={property.address}
      description={`Property for sale in ${property.suburb}, ${property.city}, New Zealand`}
      url={`https://housematch.nz/property/${property.id}`}
      address={{
        streetAddress: property.address,
        addressLocality: property.suburb,
        addressRegion: property.city,
        addressCountry: "NZ"
      }}
      geo={property.latitude && property.longitude ? {
        latitude: property.latitude,
        longitude: property.longitude
      } : undefined}
      numberOfBedrooms={property.bedrooms}
      numberOfBathroomsTotal={property.bathrooms}
      floorSize={property.floorArea ? {
        value: property.floorArea,
        unitCode: "MTK" // Square meters
      } : undefined}
    />
  );
}

// Service/Product structured data for reports
export function ReportServiceData({
  name,
  description,
  price,
  currency = "NZD",
  rating,
  reviewCount
}: {
  name: string;
  description: string;
  price: string;
  currency?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return (
    <StructuredData
      type="Product"
      name={name}
      description={description}
      offers={{
        price,
        priceCurrency: currency,
        availability: "https://schema.org/InStock"
      }}
      aggregateRating={rating && reviewCount ? {
        ratingValue: rating,
        reviewCount
      } : undefined}
    />
  );
}
