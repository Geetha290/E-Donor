console.log("🟢 eDonor server is starting...");

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio credentials
const twilioSID = 'ACc4147ad32927f610604c2ba78904155b';
const twilioToken = 'a237da3d81de133daba749eecd01d61e';
const twilioPhone = '+16084133743';
const client = twilio(twilioSID, twilioToken);

// File paths
const donorFile = path.join(__dirname, 'data', 'donor.json');
const hospitalFile = path.join(__dirname, 'data', 'hospital.json');
const bankFile = path.join(__dirname, 'data', 'bloodbank.json');
const uploadDir = path.join(__dirname, 'uploads', 'hospitals');

// Ensure directories and files exist
[donorFile, hospitalFile, bankFile].forEach(file => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/hospitals', express.static(path.join(__dirname, 'uploads', 'hospitals')));
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration for hospital image uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper functions for JSON file operations
function readJSON(file) {
  try {
    const data = fs.readFileSync(file);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ------------------ Donor Routes ------------------
app.post('/api/donors', (req, res) => {
  const donor = req.body;
  const required = ['name', 'age', 'bloodGroup', 'organ', 'contact', 'phone', 'location'];

  if (required.some(field => !donor[field])) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const donors = readJSON(donorFile);
  donors.push(donor);
  writeJSON(donorFile, donors);
  res.status(201).json({ message: 'Donor registered successfully!', donor });
});

app.get('/api/donors', (_, res) => {
  res.json(readJSON(donorFile));
});

// ------------------ Hospital Routes ------------------
app.post('/api/hospitals', upload.single('hospitalImage'), (req, res) => {
  console.log("📥 Hospital Registration Request Received");

  const { hospitalName, hospitalEmail, hospitalPhone, hospitalCity, organsAvailable } = req.body;
  const image = req.file ? `/hospitals/${req.file.filename}` : null;

  console.log("➡️ Form Data:", req.body);
  console.log("🖼 Uploaded File:", req.file ? req.file.filename : "No file uploaded");

  if (!hospitalName || !hospitalEmail || !hospitalPhone || !hospitalCity || !organsAvailable) {
    console.log("❌ Missing required fields");
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const hospitals = readJSON(hospitalFile);
  const newHospital = {
    hospitalName,
    hospitalEmail,
    hospitalPhone,
    hospitalCity,
    availableOrgans: organsAvailable,
    image
  };

  hospitals.push(newHospital);
  writeJSON(hospitalFile, hospitals);

  console.log("✅ Hospital Registered:", newHospital);
  return res.status(201).json({
    message: 'Hospital registered successfully!',
    hospital: newHospital
  });
});

app.get('/api/hospitals', (req, res) => {
  const hospitals = readJSON(hospitalFile);
  const q = req.query.query?.toLowerCase();
  const filtered = q
    ? hospitals.filter(h =>
        h.hospitalName.toLowerCase().includes(q) ||
        h.hospitalCity.toLowerCase().includes(q)
      )
    : hospitals;
  res.json(filtered);
});

// ------------------ Blood Bank Routes ------------------
app.post('/api/bloodbanks', (req, res) => {
  const { bankName, bankEmail, bankPhone, bankCity, bankCode } = req.body;
  if (!bankName || !bankEmail || !bankPhone || !bankCity || !bankCode) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const banks = readJSON(bankFile);
  const newBank = { bankName, bankEmail, bankPhone, bankCity, bankCode };
  banks.push(newBank);
  writeJSON(bankFile, banks);

  res.status(201).json({ message: 'Blood Bank registered successfully!', bloodBank: newBank });
});

app.get('/api/bloodbanks', (req, res) => {
  const banks = readJSON(bankFile);
  const q = req.query.query?.toLowerCase();
  const filtered = q
    ? banks.filter(b =>
        b.bankName.toLowerCase().includes(q) || b.bankCity.toLowerCase().includes(q)
      )
    : banks;
  res.json(filtered);
});

// ------------------ SMS Notify Route ------------------
app.post('/api/request-notify', async (req, res) => {
  const { name, organ, bloodGroup, phone } = req.body;
  if (!name || !organ || !phone) {
    return res.status(400).json({ message: 'All required fields must be filled.' });
  }

  const message = `🩸 eDonor Alert\nName: ${name}\nOrgan: ${organ}\nBlood Group: ${bloodGroup || 'N/A'}`;
  try {
    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: '+91' + phone // Only verified numbers on Twilio trial
    });
    res.json({ message: '✅ SMS sent successfully!', sid: response.sid });
  } catch (error) {
    console.error('❌ Twilio Error:', error?.response?.data || error.message || error);
    res.status(500).json({ message: '❌ Failed to send SMS via Twilio' });
  }
});

// ------------------ File Write Test Route ------------------
app.get('/test-write', (req, res) => {
  const testPath = path.join(uploadDir, 'test.txt');
  try {
    fs.writeFileSync(testPath, 'Hospital image test write OK');
    res.send('✅ File write test successful!');
  } catch (err) {
    console.error("❌ File write error:", err.message);
    res.status(500).send('❌ File write failed: ' + err.message);
  }
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
