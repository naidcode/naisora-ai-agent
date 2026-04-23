// modules/seo/schemaGenerator.js
// Generates JSON-LD schema markup for restaurant websites

function generateRestaurantSchema(restaurant) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": restaurant.name,
    "description": `${restaurant.name} — ${restaurant.category || 'Restaurant'} in ${restaurant.area}, Bangalore`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": restaurant.address || restaurant.area,
      "addressLocality": "Bangalore",
      "addressRegion": "Karnataka",
      "addressCountry": "IN"
    },
    "telephone": restaurant.phone || "",
    "url": restaurant.website || "",
    "servesCuisine": restaurant.cuisine || restaurant.category || "Indian",
    "priceRange": "₹₹",
    "areaServed": restaurant.area + ", Bangalore",
  };

  if (restaurant.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": restaurant.rating,
      "reviewCount": restaurant.review_count || 1,
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  return JSON.stringify(schema, null, 2);
}

function generateLocalBusinessSchema(business) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business.name,
    "url": business.website,
    "telephone": business.phone,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bangalore",
      "addressRegion": "Karnataka",
      "addressCountry": "IN"
    }
  };
}

function generateBlogPostSchema(post, restaurant) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "author": {
      "@type": "Organization",
      "name": restaurant.name
    },
    "publisher": {
      "@type": "Organization",
      "name": restaurant.name
    },
    "datePublished": post.date || new Date().toISOString(),
    "description": post.excerpt || post.title
  };
}

module.exports = { generateRestaurantSchema, generateLocalBusinessSchema, generateBlogPostSchema };