const BACKEND_URL = 'https://ups-tracking-server-1.onrender.com';

async function fetchTracking(trackingNumber) {
    const res = await fetch(`${BACKEND_URL}/api/track/${trackingNumber}`);
    if (!res.ok) throw new Error('Erreur API UPS');
    return res.json();
}

function pick(v) {
    return Array.isArray(v) ? v[0] : v;
}

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const numbers = document
        .getElementById('trackingInput')
        .value.split('\n')
        .map(n => n.trim())
        .filter(Boolean);

    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    document.getElementById('results').classList.add('hidden');

    if (numbers.length === 0) return;

    for (const number of numbers) {
        let status = 'Erreur';
        let service = 'Inconnu';
        let delivery = 'En cours';

        try {
            const data = await fetchTracking(number);

            const track = data?.trackResponse;
            const shipment = pick(track?.shipment);
            const pkg = pick(shipment?.package);

            // 📦 SERVICE
            service =
                shipment?.service?.description ||
                shipment?.service?.code ||
                'UPS';

            // 📍 STATUT
            const activity = pick(pkg?.activity);
            status =
                activity?.status?.description ||
                activity?.status?.type ||
                'En transit';

            // 📅 LIVRAISON
            const del = pick(pkg?.deliveryDate);
            if (del?.date) delivery = del.date;

        } catch (e) {
            status = 'Erreur UPS';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 font-mono text-xs">${number}</td>
            <td class="px-4 py-2">${service}</td>
            <td class="px-4 py-2">${status}</td>
            <td class="px-4 py-2">${delivery}</td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('results').classList.remove('hidden');
});
