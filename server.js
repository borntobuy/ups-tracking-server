const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let upsToken = null;
let tokenExpiration = 0;

async function getUpsToken() {
    const now = Date.now();
    if (upsToken && now < tokenExpiration) return upsToken;

    const auth = Buffer.from(
        `${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(
        'https://onlinetools.ups.com/security/v1/oauth/token',
        {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        }
    );

    const data = await response.json();

    upsToken = data.access_token;
    tokenExpiration = now + (data.expires_in - 60) * 1000;

    return upsToken;
}

app.get('/api/track/:trackingNumber', async (req, res) => {
    try {
        const token = await getUpsToken();
        const trackingNumber = req.params.trackingNumber;

        const response = await fetch(
            `https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'transId': Date.now().toString(),
                    'transactionSrc': 'ups-tracker'
                }
            }
        );

        const data = await response.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({
            error: 'UPS API error',
            details: err.message
        });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'UPS Tracking API running' });
});

app.listen(PORT, () => {
    console.log(`UPS Tracking server running on port ${PORT}`);
});
