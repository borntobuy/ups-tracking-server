const BACKEND_URL = 'https://ups-tracking-server-1.onrender.com';

async function fetchTracking(trackingNumber) {
    const response = await fetch(`${BACKEND_URL}/api/track/${trackingNumber}`);
    if (!response.ok) throw new Error('Erreur API UPS');
    return response.json();
}

function firstOrSelf(value) {
    return Array.isArray(value) ? value[0] : value;
}

document.getElementById('analyzeBtn').onclick = async () => {
    const input = document.getElementById('trackingInput').value;
    const numbers = input.split('\n').map(n => n.trim()).filter(Boolean);

    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');

    if (numbers.length === 0) {
        document.getElementById('error').textContent = 'Entrez au moins un numéro UPS';
        document.getElementById('error').classList.remove('hidden');
        return;
    }

    try {
        for (const number of numbers) {
            const data = await fetchTracking(number);

            const shipment = firstOrSelf(data?.trackResponse?.shipment);
            const pkg = firstOrSelf(shipment?.package);
            const activity = firstOrSelf(pkg?.activity);

            const status =
                activity?.status?.description ||
                activity?.status?.code ||
                'Statut inconnu';

            const service =
                shipment?.service?.description ||
                shipment?.service?.code ||
                'Service inconnu';

            const delivery =
                pkg?.deliveryDate?.[0]?.date ||
                pkg?.deliveryDate?.date ||
                'En cours';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-2 font-mono text-xs">${number}</td>
                <td class="p-2">${status}</td>
                <td class="p-2">${service}</td>
                <td class="p-2">${delivery}</td>
            `;
            tbody.appendChild(tr);
        }

        document.getElementById('results').classList.remove('hidden');

    } catch (err) {
        document.getElementById('error').textContent = err.message;
        document.getElementById('error').classList.remove('hidden');
    }
};



