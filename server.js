<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UPS Tracker - Fleamarketfrance</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen p-6">
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Suivi UPS - Fleamarketfrance</h1>
            <div class="flex items-center gap-2 text-sm text-green-600">
                <span>✅ Connecté (Compte 0AB268)</span>
            </div>
        </div>

        <!-- Input -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <textarea 
                id="trackingInput" 
                class="w-full h-32 p-3 border-2 border-gray-200 rounded-lg font-mono text-sm"
                placeholder="Numéros de tracking (un par ligne)&#10;Ex: 1Z0AB2680423118877"
            ></textarea>
            
            <div id="error" class="mt-3 hidden bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800"></div>
            
            <button 
                id="analyzeBtn"
                class="mt-3 w-full bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700"
            >
                Analyser
            </button>
        </div>

        <!-- Stats -->
        <div id="stats" class="grid grid-cols-4 gap-4 mb-6 hidden">
            <div class="bg-white rounded-xl shadow p-4">
                <p class="text-gray-600 text-sm">Total</p>
                <p id="statTotal" class="text-3xl font-bold text-gray-800">0</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4">
                <p class="text-gray-600 text-sm">Livrés</p>
                <p id="statDelivered" class="text-3xl font-bold text-green-600">0</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 cursor-pointer hover:bg-red-50 transition" id="delayedCard">
                <p class="text-gray-600 text-sm">Retard Express</p>
                <p id="statDelayed" class="text-3xl font-bold text-red-600">0</p>
                <button id="exportDelayed" class="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 hidden">
                    📥 Export TXT
                </button>
            </div>
            <div class="bg-white rounded-xl shadow p-4">
                <p class="text-gray-600 text-sm">Non-Express</p>
                <p id="statWrong" class="text-3xl font-bold text-orange-600">0</p>
            </div>
        </div>

        <!-- Results -->
        <div id="results" class="bg-white rounded-xl shadow-lg overflow-hidden hidden">
            <div class="p-4 border-b">
                <h2 class="text-xl font-bold">Résultats</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left">Tracking</th>
                            <th class="px-4 py-3 text-left">Service</th>
                            <th class="px-4 py-3 text-left">Statut</th>
                            <th class="px-4 py-3 text-left">Expédition</th>
                            <th class="px-4 py-3 text-left">Livraison</th>
                            <th class="px-4 py-3 text-left">Jours</th>
                            <th class="px-4 py-3 text-left">Alerte</th>
                        </tr>
                    </thead>
                    <tbody id="resultsBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const BACKEND_URL = 'https://ups-tracking-server-1.onrender.com';

        const serviceMap = {
            '007': { name: 'UPS Worldwide Express', isExpress: true, checkDelay: true },
            '07': { name: 'UPS Worldwide Express', isExpress: true, checkDelay: true },
            '7': { name: 'UPS Worldwide Express', isExpress: true, checkDelay: true },
            '065': { name: 'UPS Express Saver', isExpress: true, checkDelay: true },
            '65': { name: 'UPS Express Saver', isExpress: true, checkDelay: true },
            '008': { name: 'UPS Expedited', isExpress: false, checkDelay: false },
            '08': { name: 'UPS Expedited', isExpress: false, checkDelay: false },
            '8': { name: 'UPS Expedited', isExpress: false, checkDelay: false },
            '011': { name: 'UPS Standard', isExpress: false, checkDelay: false },
            '11': { name: 'UPS Standard', isExpress: false, checkDelay: false }
        };

        // Jours fériés français (à mettre à jour chaque année)
        const frenchHolidays = [
            '2025-01-01', // Jour de l'an
            '2025-04-21', // Lundi de Pâques
            '2025-05-01', // Fête du travail
            '2025-05-08', // Victoire 1945
            '2025-05-29', // Ascension
            '2025-06-09', // Lundi de Pentecôte
            '2025-07-14', // Fête nationale
            '2025-08-15', // Assomption
            '2025-11-01', // Toussaint
            '2025-11-11', // Armistice 1918
            '2025-12-25', // Noël
            '2024-01-01',
            '2024-04-01',
            '2024-05-01',
            '2024-05-08',
            '2024-05-09',
            '2024-05-20',
            '2024-07-14',
            '2024-08-15',
            '2024-11-01',
            '2024-11-11',
            '2024-12-25'
        ];

        function isHoliday(date) {
            const dateStr = date.toISOString().split('T')[0];
            return frenchHolidays.includes(dateStr);
        }

        function calculateBusinessDays(startDate, endDate) {
            let count = 0;
            const current = new Date(startDate);
            const end = new Date(endDate);
            
            while (current <= end) {
                const day = current.getDay();
                if (day !== 0 && day !== 6 && !isHoliday(current)) count++;
                current.setDate(current.getDate() + 1);
            }
            return count;
        }

        function formatDate(yyyymmdd) {
            if (!yyyymmdd) return null;
            const y = yyyymmdd.substring(0, 4);
            const m = yyyymmdd.substring(4, 6);
            const d = yyyymmdd.substring(6, 8);
            return `${d}/${m}/${y}`;
        }

        function parseDate(yyyymmdd) {
            const y = yyyymmdd.substring(0, 4);
            const m = yyyymmdd.substring(4, 6);
            const d = yyyymmdd.substring(6, 8);
            return new Date(y, m - 1, d);
        }

        async function fetchTracking(trackingNumber) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/track/${trackingNumber}`);
                if (!response.ok) {
                    return { trackingNumber, status: 'Erreur', error: 'Non trouvé' };
                }

                const data = await response.json();
                const shipment = data.trackResponse?.shipment?.[0];
                if (!shipment) {
                    return { trackingNumber, status: 'Erreur', error: 'Données manquantes' };
                }

                const pkg = shipment.package?.[0];
                const activity = pkg?.activity?.[0];
                
                const shipDateRaw = shipment.pickupDate;
                const deliveryDateRaw = pkg?.deliveryDate?.[0]?.date;
                
                const serviceCodeRaw = pkg?.service?.levelCode || pkg?.service?.code || shipment.service?.levelCode || shipment.service?.code || '11';
                const serviceInfo = serviceMap[serviceCodeRaw] || { name: `Service inconnu (${serviceCodeRaw})`, isExpress: false, checkDelay: false };
                
                const statusCode = activity?.status?.code;
                const isDelivered = statusCode === '9E' || statusCode === 'D';
                
                let businessDays = null;
                if (shipDateRaw && deliveryDateRaw && isDelivered) {
                    businessDays = calculateBusinessDays(parseDate(shipDateRaw), parseDate(deliveryDateRaw));
                }

                return {
                    trackingNumber,
                    status: isDelivered ? 'Livré' : (activity?.status?.description || 'En transit'),
                    shipDate: formatDate(shipDateRaw) || 'N/A',
                    deliveryDate: formatDate(deliveryDateRaw),
                    businessDays,
                    serviceType: serviceInfo.name,
                    serviceCode: serviceCodeRaw,
                    isExpressService: serviceInfo.isExpress,
                    shouldCheckDelay: serviceInfo.checkDelay,
                    isDelivered
                };
            } catch (error) {
                return { trackingNumber, status: 'Erreur', error: error.message };
            }
        }

        document.getElementById('analyzeBtn').addEventListener('click', async () => {
            const input = document.getElementById('trackingInput').value;
            const numbers = input.split('\n').map(n => n.trim()).filter(n => n);
            
            if (numbers.length === 0) {
                document.getElementById('error').textContent = 'Entrez au moins un numéro';
                document.getElementById('error').classList.remove('hidden');
                return;
            }

            document.getElementById('error').classList.add('hidden');
            document.getElementById('analyzeBtn').textContent = 'Analyse en cours...';
            document.getElementById('analyzeBtn').disabled = true;

            const results = [];
            for (const number of numbers) {
                const data = await fetchTracking(number);
                results.push(data);
                await new Promise(r => setTimeout(r, 500));
            }

            // Stats
            const delivered = results.filter(r => r.isDelivered);
            const delayed = delivered.filter(r => r.shouldCheckDelay && r.businessDays > 2);
            const wrong = results.filter(r => !r.isExpressService && r.status !== 'Erreur');

            document.getElementById('statTotal').textContent = results.length;
            document.getElementById('statDelivered').textContent = delivered.length;
            document.getElementById('statDelayed').textContent = delayed.length;
            document.getElementById('statWrong').textContent = wrong.length;
            document.getElementById('stats').classList.remove('hidden');

            // Bouton export retards
            if (delayed.length > 0) {
                document.getElementById('exportDelayed').classList.remove('hidden');
            }

            // Export des retards
            document.getElementById('exportDelayed').onclick = () => {
                const delayedNumbers = delayed.map(r => r.trackingNumber).join(',');
                const blob = new Blob([delayedNumbers], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `retards_express_${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
            };

            // Table
            const tbody = document.getElementById('resultsBody');
            tbody.innerHTML = '';
            
            results.forEach(r => {
                const isDelayed = r.shouldCheckDelay && r.businessDays > 2;
                const isWrong = !r.isExpressService && r.status !== 'Erreur';
                
                const row = document.createElement('tr');
                row.className = (isDelayed || isWrong) ? 'bg-red-50' : '';
                row.innerHTML = `
                    <td class="px-4 py-3 font-mono text-xs">${r.trackingNumber}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 text-xs rounded ${r.isExpressService ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">
                            ${r.serviceType} (${r.serviceCode})
                        </span>
                    </td>
                    <td class="px-4 py-3">${r.status}</td>
                    <td class="px-4 py-3">${r.shipDate}</td>
                    <td class="px-4 py-3">${r.deliveryDate || 'En cours'}</td>
                    <td class="px-4 py-3">${r.businessDays ? r.businessDays + 'j' : '-'}</td>
                    <td class="px-4 py-3">
                        ${isDelayed ? '<span class="text-xs text-red-600 font-bold">RETARD</span>' : ''}
                        ${isWrong ? '<span class="text-xs text-orange-600 font-bold">PAS EXPRESS</span>' : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.getElementById('results').classList.remove('hidden');
            document.getElementById('analyzeBtn').textContent = 'Analyser';
            document.getElementById('analyzeBtn').disabled = false;
        });
    </script>
</body>
</html>
