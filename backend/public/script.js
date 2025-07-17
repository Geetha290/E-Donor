// DOM references
const hospitalSearch = document.getElementById('hospitalSearch');
const bankSearch = document.getElementById('bankSearch');
const hospitalResults = document.getElementById('hospitalResults');
const bankResults = document.getElementById('bankResults');

// Helper to create a result card
function createCard(data, type) {
  if (type === 'hospital') {
    const imageUrl = data.image
      ? data.image.startsWith('http') ? data.image : `https://e-donor-1.onrender.com${data.image}`
      : 'default-hospital.jpg';

    return `
      <div class="donor-card">
        <img src="${imageUrl}" alt="${data.hospitalName}" style="width:100%; border-radius:8px; margin-bottom:10px;">
        <h3>${data.hospitalName}</h3>
        <p><strong>Email:</strong> ${data.hospitalEmail}</p>
        <p><strong>Phone:</strong> ${data.hospitalPhone}</p>
        <p><strong>City:</strong> ${data.hospitalCity}</p>
        ${data.availableOrgans ? `<p><strong>Organs:</strong> ${data.availableOrgans}</p>` : ''}
      </div>
    `;
  } else if (type === 'bank') {
    return `
      <div class="donor-card">
        <h3>${data.bankName}</h3>
        <p><strong>Email:</strong> ${data.bankEmail}</p>
        <p><strong>Phone:</strong> ${data.bankPhone}</p>
        <p><strong>City:</strong> ${data.bankCity}</p>
        <p><strong>Code:</strong> ${data.bankCode || 'N/A'}</p>
      </div>
    `;
  }
  return '';
}

// Fetch and display hospitals
hospitalSearch?.addEventListener('input', async () => {
  const query = hospitalSearch.value.trim();
  if (!query) {
    hospitalResults.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`https://e-donor-1.onrender.com/api/hospitals?query=${encodeURIComponent(query)}`);
    const hospitals = await res.json();
    hospitalResults.innerHTML = hospitals.length
      ? hospitals.map(h => createCard(h, 'hospital')).join('')
      : '<p>No hospitals found.</p>';
  } catch (err) {
    console.error('Hospital search error:', err);
    hospitalResults.innerHTML = '<p style="color:red;">Error fetching hospitals.</p>';
  }
});

// Fetch and display blood banks
bankSearch?.addEventListener('input', async () => {
  const query = bankSearch.value.trim();
  if (!query) {
    bankResults.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`https://e-donor-1.onrender.com/api/bloodbanks?query=${encodeURIComponent(query)}`);
    const banks = await res.json();
    bankResults.innerHTML = banks.length
      ? banks.map(b => createCard(b, 'bank')).join('')
      : '<p>No blood banks found.</p>';
  } catch (err) {
    console.error('Blood bank search error:', err);
    bankResults.innerHTML = '<p style="color:red;">Error fetching blood banks.</p>';
  }
});
