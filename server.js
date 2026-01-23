

// Serveur Node.js pour l'API UPS
// Déployez ce fichier sur Render.com (gratuit)

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration UPS
const UPS_CONFIG = {
  clientId: 'zhxpib2VGdAX5lpYkd1ysvuzYFKw6KvhE9YGG59yIZ5UlO2B',
  clientSecret: 'GY5BDqDzUQAWyBzKbN1wixhKvA78K9OjgzAoS5GfSWT5ABlF9ASYNFBZnsrkrHvN',
  accountNumber: '0AB268'
};

// Middleware
app.use(cors()); // Permet tous les domaines
app.use(express.json());

// Cache pour le token OAuth (évite de le régénérer à chaque appel)
let tokenCache = {
  token: null,
  expiresAt: null
};

// Fonction pour obtenir le token OAuth UPS
async function getUPSToken() {
  // Si on a un token valide en cache, on l'utilise
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  try {
    const credentials = Buffer.from(
      `${UPS_CONFIG.clientId}:${UPS_CONFIG.clientSecret}`
    ).toString('base64');

    const response = await fetch('https://onlinetools.ups.com/security/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur OAuth UPS: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Mettre en cache (token valide 1h, on prend 55min pour être sûr)
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (55 * 60 * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('Erreur getUPSToken:', error);
    throw error;
  }
}

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur UPS Tracking API opérationnel',
    account: UPS_CONFIG.accountNumber
  });
});

// Route pour tracker un colis
app.get('/api/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    console.log(`Tracking demandé pour: ${trackingNumber}`);

    // Obtenir le token
    const token = await getUPSToken();

    // Appeler l'API UPS
    const response = await fetch(
      `https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}?locale=fr_FR`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'transId': `fleamarket-${Date.now()}`,
          'transactionSrc': 'fleamarketfrance'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          error: 'Numéro de tracking non trouvé',
          trackingNumber
        });
      }
      
      const errorText = await response.text();
      throw new Error(`UPS API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`Tracking réussi pour: ${trackingNumber}`);
    
    res.json(data);
  } catch (error) {
    console.error('Erreur tracking:', error);
    res.status(500).json({ 
      error: error.message,
      trackingNumber: req.params.trackingNumber
    });
  }
});

// Route pour tester la connexion UPS
app.get('/api/test', async (req, res) => {
  try {
    const token = await getUPSToken();
    res.json({ 
      status: 'OK', 
      message: 'Connexion UPS réussie',
      tokenObtained: !!token
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur UPS Tracking démarré sur le port ${PORT}`);
  console.log(`📦 Compte UPS: ${UPS_CONFIG.accountNumber}`);
});

