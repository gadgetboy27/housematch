import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
}

export function SEO({
  title = 'HouseMatch NZ - Find Your Dream Home in New Zealand',
  description = 'Discover your perfect property in New Zealand with HouseMatch. Swipe through listings in Auckland, Wellington, Christchurch and more. AI-powered matching, property reports, and seamless home buying.',
  keywords = 'house matching nz, find home new zealand, property search nz, real estate new zealand, auckland homes, wellington property, christchurch real estate, first home buyer nz, property match',
  ogTitle,
  ogDescription,
  ogImage = '/og-image.jpg',
  ogType = 'website',
  canonical,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to set or update meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Set basic meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    
    // Open Graph tags
    setMetaTag('og:title', ogTitle || title, true);
    setMetaTag('og:description', ogDescription || description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', 'HouseMatch NZ', true);
    
    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', ogTitle || title);
    setMetaTag('twitter:description', ogDescription || description);
    setMetaTag('twitter:image', ogImage);
    
    // Robots meta tag
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Canonical URL
    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      
      linkElement.setAttribute('href', canonical);
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogType, canonical, noindex]);

  return null;
}

// Pre-configured SEO for common pages
export const HomePageSEO = () => (
  <SEO
    title="HouseMatch NZ - Swipe Your Way to Your Dream Home"
    description="Find your perfect property in New Zealand with HouseMatch. Swipe through listings, get AI-powered recommendations, and access comprehensive property reports. Start your home journey today!"
    keywords="house matching nz, property swipe nz, find home new zealand, auckland property, wellington homes, christchurch real estate, ai property matching"
    canonical="https://housematch.nz/"
  />
);

export const PropertyListingsSEO = () => (
  <SEO
    title="Browse Properties - HouseMatch NZ"
    description="Swipe through thousands of properties across New Zealand. Filter by location, price, bedrooms and more. Find homes in Auckland, Wellington, Christchurch, Hamilton, Tauranga and beyond."
    keywords="nz property listings, houses for sale nz, browse homes new zealand, property search"
    canonical="https://housematch.nz/properties"
  />
);

export const ReportsSEO = () => (
  <SEO
    title="Property Reports & Title Searches - HouseMatch NZ"
    description="Get instant property reports, title searches, LIM reports, and building inspections for New Zealand properties. Fast, affordable, and white-labeled reports delivered digitally."
    keywords="property report nz, title search nz, lim report, building inspection nz, property due diligence"
    canonical="https://housematch.nz/reports"
  />
);

export const PremiumSEO = () => (
  <SEO
    title="Premium Membership - HouseMatch NZ"
    description="Upgrade to HouseMatch Premium for $29/month. Get 2 free title searches monthly, priority AI recommendations, premium support, and exclusive property insights."
    keywords="premium property membership nz, title search subscription, property insights nz"
    canonical="https://housematch.nz/premium"
  />
);

export const OffersSEO = () => (
  <SEO
    title="Make an Offer - HouseMatch NZ"
    description="Submit property offers with our ADLS-compliant offer wizard. Express interest or make official purchase offers on New Zealand properties with legal protection."
    keywords="property offer nz, make offer on house, adls offer form, buy property nz"
    canonical="https://housematch.nz/offers"
  />
);
