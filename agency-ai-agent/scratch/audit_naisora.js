const { auditWebsite, crawlOnPageSeo } = require('../modules/seo/seoAudit');
const { fullAudit } = require('../modules/seo/pagespeedAudit');

async function runAudit() {
  const url = 'https://naisora.com';
  console.log(`Starting SEO Audit for ${url}...`);

  try {
    const onPage = await crawlOnPageSeo(url);
    console.log('\n--- On-Page SEO Results ---');
    console.log(JSON.stringify(onPage, null, 2));

    const pagespeed = await fullAudit(url);
    console.log('\n--- PageSpeed Results ---');
    console.log(JSON.stringify(pagespeed, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

runAudit();
