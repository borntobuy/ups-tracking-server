import express from "express";
import fetch from "node-fetch";

/* ==============================
   ENV
================================ */
const {
  SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET,
  SHOPIFY_STORE_DOMAIN,
  APP_URL,
  MODE = "RUN"
} = process.env;

/* ==============================
   CONSTANTES SEO
================================ */
const PHRASES = [
  "🇺🇸 US Buyers: 95% of items tariff-free to USA - Fast international shipping",
  "📦 Worldwide shipping available - Carefully packed for safe delivery",
  "✈️ Express shipping to US - Most items exempt from customs duties",
  "🎁 Secure packaging included - Ships within 24-48 hours",
  "🌍 International delivery - Tracked shipping to all destinations",
  "⭐ Guaranteed authentic French vintage - Each piece verified and selected in France",
  "🔍 Carefully curated antique from France - True farmhouse charm",
  "💎 Museum-quality piece - Authentic French artisan craftsmanship",
  "🏺 Rare collectible - Genuine French heritage item",
  "📸 Additional photos available upon request - Ask any questions before purchasing",
  "💬 Questions welcome - We're here to help you find the perfect piece",
  "🤝 Expert assistance - Contact us for detailed condition reports",
  "🏠 Perfect for French country decor, farmhouse styling, or vintage collections",
  "✨ Ideal for rustic home decor, shabby chic interiors, or antique enthusiasts"
];

const START_TAG = "<!-- SEO_ROTATION_START -->";
const END_TAG   = "<!-- SEO_ROTATION_END -->";

const PRODUCTS_PER_DAY = MODE === "TEST" ? 1 : 5;
const POOL_SIZE = 300;

/* ==============================
   APP / TOKEN
================================ */
const app = express();
let ACCESS_TOKEN = null;

/* ==============================
   OAUTH SHOPIFY
================================ */
app.get("/auth", (req, res) => {
  const redirectUri = `${APP_URL}/auth/callback`;

  const authUrl =
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize` +
    `?client_id=${SHOPIFY_CLIENT_ID}` +
    `&scope=read_products,write_products` +
    `&redirect_uri=${redirectUri}`;

  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code
      })
    }
  );

  const data = await response.json();
  ACCESS_TOKEN = data.access_token;

  console.log("✅ Shopify app authorized");
  res.send("✅ App autorisée. Vous pouvez fermer cette page.");
});

/* ==============================
   UTILS
================================ */
function cleanDescription(html = "") {
  const regex = new RegExp(`${START_TAG}[\\s\\S]*?${END_TAG}`, "g");
  return html.replace(regex, "").trim();
}

function addPhrase(html, phrase) {
  const clean = cleanDescription(html);
  return `${clean}\n\n${START_TAG}\n<p>${phrase}</p>\n${END_TAG}`;
}

async function shopifyFetch(endpoint, method = "GET", body = null) {
  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/${endpoint}`,
    {
      method,
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : null
    }
  );
  return res.json();
}

/* ==============================
   ROUTE /run (appelée par Render Cron Job)
================================ */
app.get("/run", async (req, res) => {
  if (!ACCESS_TOKEN) {
    console.log("❌ App non autorisée – /run annulé");
    res.send("❌ App non autorisée");
    return;
  }

  console.log("▶️ Rotation SEO déclenchée");

  const data = await shopifyFetch("products.json?limit=250");
  const products = data.products
    .filter(p => p.status === "active")
    .slice(0, POOL_SIZE);

  if (!products.length) {
    console.log("⚠️ Aucun produit trouvé");
    res.send("⚠️ Aucun produit trouvé");
    return;
  }

  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const phrase = PHRASES[dayIndex % PHRASES.length];

  const startIndex = (dayIndex * PRODUCTS_PER_DAY) % products.length;
  const selected = products.slice(startIndex, startIndex + PRODUCTS_PER_DAY);

  for (const product of selected) {
    const newBody =
      MODE === "CLEAN"
        ? cleanDescription(product.body_html)
        : addPhrase(product.body_html, phrase);

    await shopifyFetch(
      `products/${product.id}.json`,
      "PUT",
      {
        product: {
          id: product.id,
          body_html: newBody
        }
      }
    );

    console.log(`✔️ Produit ${product.id} mis à jour`);
  }

  console.log("✅ Rotation terminée");
  res.send("✅ Rotation exécutée");
});

/* ==============================
   ROOT (optionnel)
================================ */
app.get("/", (req, res) => {
  res.send("✅ Shopify SEO Rotation App running");
});

/* ==============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
});
