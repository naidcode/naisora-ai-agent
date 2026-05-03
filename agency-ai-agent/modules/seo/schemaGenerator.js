/**
 * modules/seo/schemaGenerator.js
 * Generates proper JSON-LD schema for restaurants and FAQ pages.
 */

function generateRestaurantSchema(lead) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": lead.business_name || lead.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": lead.address || "",
      "addressLocality": lead.area || "Bangalore",
      "addressRegion": "Karnataka",
      "addressCountry": "IN"
    },
    "telephone": lead.phone || "",
    "url": lead.website || "",
    "servesCuisine": lead.category || "",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": lead.rating || 0,
      "reviewCount": lead.review_count || 0
    },
    "geo": {
      "@type": "GeoCoordinates"
    },
    "sameAs": [
      lead.google_maps_url,
      lead.instagram_handle 
        ? `https://instagram.com/${lead.instagram_handle.replace('@','')}` 
        : null
    ].filter(Boolean)
  };

  return schema;
}

/**
 * Generate FAQ schema from blog FAQ list
 */
function generateFAQSchema(faqs) {
  if (!faqs || !Array.isArray(faqs)) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q || faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a || faq.answer
      }
    }))
  };
}

module.exports = {
  generateRestaurantSchema,
  generateFAQSchema
};