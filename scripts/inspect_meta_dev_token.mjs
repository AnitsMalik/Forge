import dotenv from 'dotenv';
dotenv.config();

async function inspectMetaDevToken() {
  const token = process.env.META_DEV_ACCESS_TOKEN;
  if (!token) {
    console.log('No META_DEV_ACCESS_TOKEN');
    return;
  }

  // 1. Check /me or /debug_token
  try {
    const meRes = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`);
    const meData = await meRes.json();
    console.log('/me response:', meData);

    // 2. Check /me/accounts (Pages)
    const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}`);
    const pagesData = await pagesRes.json();
    console.log('/me/accounts response count:', pagesData.data ? pagesData.data.length : 'none');
    if (pagesData.data) {
      for (const p of pagesData.data) {
        console.log(`Page: id=${p.id}, name="${p.name}", tasks=${JSON.stringify(p.tasks)}, hasAccessToken=${!!p.access_token}`);
        // Check if page has instagram_business_account
        const igRes = await fetch(`https://graph.facebook.com/v20.0/${p.id}?fields=instagram_business_account,connected_instagram_account,name&access_token=${p.access_token || token}`);
        const igData = await igRes.json();
        console.log(`  Instagram linked to ${p.id}:`, igData);
      }
    } else {
      console.log('/me/accounts error:', pagesData.error);
    }

    // 3. Check directly for page 1405588742634526
    const p14Res = await fetch(`https://graph.facebook.com/v20.0/1405588742634526?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${token}`);
    const p14Data = await p14Res.json();
    console.log('Direct query for 1405588742634526:', p14Data);

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
inspectMetaDevToken();
