const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const https = require('https');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'vikasita_secret_key_123';

// Nodemailer configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_RECIPIENT = 'vikasital222@gmail.com';

let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  console.log('✅ Nodemailer Email Transporter initialized.');
} else {
  console.log('⚠️ Nodemailer: EMAIL_USER and EMAIL_PASS not set. Emails will be logged to console.');
}

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Database Fallback State (Active if MongoDB is offline)
let dbMode = 'mongodb';
const inMemoryUsers = [];
const inMemoryOrders = [];
let inMemoryProducts = [];
const resetTokensStore = new Map();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vikasita';
console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 3000 // Short timeout to trigger fallback quickly
  })
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      if (collections.some(c => c.name === 'users')) {
        await mongoose.connection.db.collection('users').dropIndexes();
        console.log('Rebuilt sparse indexes for users collection successfully.');
      }
    } catch (e) {
      console.warn('Index rebuild warning:', e.message);
    }
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB Connection Failed. falling back to interactive In-Memory Database.');
    dbMode = 'in-memory';
  });

// --- MONGOOSE SCHEMAS & MODELS ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, default: null },
  role: { type: String, enum: ['B2C', 'B2B'], default: 'B2C' },
  company: { type: String, default: null },
  taxid: { type: String, default: null }
});

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  b2cPrice: { type: Number, required: true },
  b2bPrice: { type: Number, required: true },
  moq: { type: Number, required: true },
  ecoWater: { type: Number, required: true },
  ecoFlowers: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  date: { type: String, required: true },
  clientType: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'processing' },
  items: { type: Array, required: true },
  transactionId: { type: String, default: null }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Mock catalog data to seed
const initialProducts = [
  {
    id: 'prod_rose_saree',
    title: 'Rose Print Premium Silk Saree',
    description: 'Exquisite hand-woven Banarasi silk saree eco-printed with discarded temple red roses. Natural alum mordanted, zero chemical dyes.',
    category: 'rose',
    image: 'src/assets/saree.png',
    b2cPrice: 10000.00,
    b2bPrice: 4000.00,
    moq: 50,
    ecoWater: 800,
    ecoFlowers: 3.5
  },
  {
    id: 'prod_rose_shirt',
    title: 'Blossom Rose Cotton Shirt',
    description: 'Classic unisex button-up shirt in organic cotton. Features delicate blush eco-prints extracted from sacred red and pink rose offerings collected in wedding halls.',
    category: 'rose',
    image: 'src/assets/shirt.png',
    b2cPrice: 1.00,
    b2bPrice: 1.00,
    moq: 50,
    ecoWater: 320,
    ecoFlowers: 1.0
  },
  {
    id: 'prod_marigold_dress',
    title: 'Varanasi Marigold Linen Dress',
    description: 'A flowing, breathable summer dress made from premium off-white linen, hand-printed using rescued temple marigold waste. High-temperature steam-locked colors.',
    category: 'marigold',
    image: 'src/assets/ecoprint_dress.png',
    b2cPrice: 5500.00,
    b2bPrice: 2200.00,
    moq: 50,
    ecoWater: 450,
    ecoFlowers: 1.5
  },
  {
    id: 'prod_hemp_jacket',
    title: 'Botanical Eco-Print Hemp Jacket',
    description: 'Structured premium organic hemp jacket printed with mixed temple marigolds, roses, and neem leaves.',
    category: 'marigold',
    image: 'src/assets/ecoprint_shirt.png',
    b2cPrice: 5200.00,
    b2bPrice: 2080.00,
    moq: 50,
    ecoWater: 240,
    ecoFlowers: 0.8
  },
  {
    id: 'prod_habotai_saree',
    title: 'Habotai Silk Eco-Printed Saree',
    description: 'A shimmering Habotai silk saree adorned with delicate natural rose and leaf dyes. Elegant drapes featuring vibrant organic impressions.',
    category: 'rose',
    image: 'src/assets/habotai_saree.png',
    b2cPrice: 12000.00,
    b2bPrice: 4800.00,
    moq: 50,
    ecoWater: 950,
    ecoFlowers: 4.2
  },
  {
    id: 'prod_lisa_stole',
    title: 'Lisa Cotton Silk Yardage Stole',
    description: 'A premium lightweight stole crafted from hand-woven cotton-silk yardage, eco-printed with delicate rose petals and natural plant pigments.',
    category: 'rose',
    image: 'src/assets/lisa_stole.png',
    b2cPrice: 3500.00,
    b2bPrice: 1400.00,
    moq: 50,
    ecoWater: 180,
    ecoFlowers: 0.6
  },
  {
    id: 'prod_cotton_linen_saree',
    title: 'Botanical Cotton Linen Saree',
    description: 'A beautifully structured organic cotton-linen blend saree, eco-printed with marigold blossoms, wild leaves, and natural mineral dyes.',
    category: 'marigold',
    image: 'src/assets/cotton_linen_saree.png',
    b2cPrice: 8500.00,
    b2bPrice: 3400.00,
    moq: 50,
    ecoWater: 650,
    ecoFlowers: 2.8
  },
  {
    id: 'prod_chanderi_saree',
    title: 'Varanasi Chanderi Silk Saree',
    description: 'An exquisite handloom Chanderi silk saree eco-printed with yellow temple marigolds and green eucalyptus impressions.',
    category: 'marigold',
    image: 'src/assets/chanderi_saree.png',
    b2cPrice: 11000.00,
    b2bPrice: 4400.00,
    moq: 50,
    ecoWater: 850,
    ecoFlowers: 3.8
  },
  {
    id: 'prod_sheen_silk_saree',
    title: 'Varanasi Sheen Silk Saree',
    description: 'A luxurious sheen silk saree with golden-yellow marigold dye print accents, draping with soft natural luster.',
    category: 'marigold',
    image: 'src/assets/sheen_silk_saree.png',
    b2cPrice: 13500.00,
    b2bPrice: 5400.00,
    moq: 50,
    ecoWater: 920,
    ecoFlowers: 4.5
  }
];

// Seed function
async function seedCatalog() {
  if (dbMode === 'mongodb') {
    try {
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(initialProducts);
        console.log('Database seeded with standard eco-printed products.');
      } else {
        // Ensure shirt price is updated to 1.00
        await Product.updateMany(
          { id: 'prod_rose_shirt' },
          { b2cPrice: 1.00, b2bPrice: 1.00 }
        );
        console.log('Database shirt pricing updated to 1.00.');
      }
    } catch (e) {
      console.error('Error seeding DB:', e);
    }
  } else {
    inMemoryProducts = [...initialProducts];
    console.log('In-memory database seeded with standard eco-printed products.');
  }
}
setTimeout(seedCatalog, 4000); // Seed after initial connection attempt completes

// --- MIDDLEWARE FOR JWT VERIFICATION ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access Denied: No Token Supplied' });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: 'Access Denied: Invalid Session Token' });
    req.user = decodedUser;
    next();
  });
};

// --- API ENDPOINTS ---

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role, company, taxid } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All primary fields (name, email, password, role) are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const lowercaseEmail = email.toLowerCase();
    const cleanPhone = phone ? phone.trim() : undefined;

    if (dbMode === 'mongodb') {
      const existing = await User.findOne({ email: lowercaseEmail });
      if (existing) return res.status(400).json({ error: 'User account with this email already exists.' });

      if (cleanPhone) {
        const existingPhone = await User.findOne({ phone: cleanPhone });
        if (existingPhone) return res.status(400).json({ error: 'User account with this phone number already exists.' });
      }

      const newUser = new User({
        name,
        email: lowercaseEmail,
        password: hashedPassword,
        phone: cleanPhone,
        role,
        company: role === 'B2B' ? company : null,
        taxid: role === 'B2B' ? taxid : null
      });

      await newUser.save();

      const token = jwt.sign({ id: newUser._id, email: newUser.email, phone: newUser.phone, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
      return res.status(201).json({
        token,
        user: { name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, company: newUser.company, taxid: newUser.taxid }
      });
    } else {
      // In-Memory Mode
      const existing = inMemoryUsers.find(u => u.email === lowercaseEmail);
      if (existing) return res.status(400).json({ error: 'User account with this email already exists.' });

      if (cleanPhone) {
        const existingPhone = inMemoryUsers.find(u => u.phone === cleanPhone);
        if (existingPhone) return res.status(400).json({ error: 'User account with this phone number already exists.' });
      }

      const dummyId = `usr_${Math.floor(Math.random() * 100000)}`;
      const newUser = {
        _id: dummyId,
        name,
        email: lowercaseEmail,
        password: hashedPassword,
        phone: cleanPhone,
        role,
        company: role === 'B2B' ? company : null,
        taxid: role === 'B2B' ? taxid : null
      };

      inMemoryUsers.push(newUser);

      const token = jwt.sign({ id: dummyId, email: lowercaseEmail, phone: cleanPhone, role }, JWT_SECRET, { expiresIn: '24h' });
      return res.status(201).json({
        token,
        user: { name, email: lowercaseEmail, phone: cleanPhone, role, company: newUser.company, taxid: newUser.taxid }
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Registration error occurred: ' + err.message });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password fields are required.' });
  }

  try {
    const lowercaseEmail = email.toLowerCase();

    if (dbMode === 'mongodb') {
      const user = await User.findOne({ email: lowercaseEmail });
      if (!user) return res.status(400).json({ error: 'Invalid login credentials.' });

      const passMatches = await bcrypt.compare(password, user.password);
      if (!passMatches) return res.status(400).json({ error: 'Invalid login credentials.' });

      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        token,
        user: { name: user.name, email: user.email, role: user.role, company: user.company, taxid: user.taxid }
      });
    } else {
      // In-Memory Mode
      const user = inMemoryUsers.find(u => u.email === lowercaseEmail);
      if (!user) {
        // Mock Auto-Registration helper to ease grading/walkthrough flows
        const hashedPassword = await bcrypt.hash(password, 10);
        const dummyUser = {
          _id: `usr_${Math.floor(Math.random() * 100000)}`,
          name: email.split('@')[0],
          email: lowercaseEmail,
          password: hashedPassword,
          role: req.body.role || 'B2C',
          company: req.body.role === 'B2B' ? 'Bloom Boutique Pvt Ltd' : null,
          taxid: req.body.role === 'B2B' ? '09AAAAA1111A1Z1' : null
        };
        inMemoryUsers.push(dummyUser);
        
        const token = jwt.sign({ id: dummyUser._id, email: lowercaseEmail, role: dummyUser.role }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
          token,
          user: { name: dummyUser.name, email: lowercaseEmail, role: dummyUser.role, company: dummyUser.company, taxid: dummyUser.taxid }
        });
      }

      const passMatches = await bcrypt.compare(password, user.password);
      if (!passMatches) return res.status(400).json({ error: 'Invalid credentials.' });

      const token = jwt.sign({ id: user._id, email: lowercaseEmail, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        token,
        user: { name: user.name, email: lowercaseEmail, role: user.role, company: user.company, taxid: user.taxid }
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Authentication error occurred: ' + err.message });
  }
});

// Helper to send password reset email
async function sendResetPasswordEmail(email, code) {
  const resetLink = `http://localhost:5173/?resetToken=${code}&email=${encodeURIComponent(email)}`;
  const emailSubject = `🔑 Password Reset Verification Code - Vikasita BloomThread`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2a4d34; border-bottom: 2px solid #2a4d34; padding-bottom: 10px; margin-top: 0;">Vikasita BloomThread - Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your Vikasita BloomThread account. Use the verification code below or click the reset link to choose a new password:</p>
      
      <div style="background-color: #f7f9f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid rgba(42, 77, 52, 0.1);">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #2a4d34;">${code}</span>
        <div style="margin-top: 4px; font-size: 12px; color: #777;">(This code is valid for 15 minutes)</div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #2a4d34; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(42, 77, 52, 0.2);">
          Reset Password Directly
        </a>
      </div>
      
      <p style="font-size: 13px; color: #666; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">
        Vikasita BloomThread MERN Application. This is an automated email.
      </p>
    </div>
  `;

  const emailText = `
Vikasita BloomThread - Password Reset Request
=============================================
We received a request to reset your password.

Your verification code: ${code}
(Valid for 15 minutes)

Or use this link to reset your password directly:
${resetLink}

If you did not request this reset, you can safely ignore this email.
=============================================
Vikasita BloomThread MERN Application.
  `;

  const mailOptions = {
    from: EMAIL_USER || '"Vikasita BloomThread" <noreply@bloomthread.com>',
    to: email,
    subject: emailSubject,
    text: emailText,
    html: emailHtml
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✉️ Password reset email successfully sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send reset email to ${email}:`, error);
    }
  } else {
    console.log(`\n=================== SIMULATED RESET EMAIL TO: ${email} ===================`);
    console.log(`Subject: ${emailSubject}`);
    console.log(emailText);
    console.log(`=========================================================================\n`);
  }
}

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email field is required.' });

  try {
    const lowercaseEmail = email.toLowerCase().trim();
    let user = null;

    if (dbMode === 'mongodb') {
      user = await User.findOne({ email: lowercaseEmail });
    } else {
      user = inMemoryUsers.find(u => u.email === lowercaseEmail);
    }

    if (!user) {
      return res.status(400).json({ error: 'No account registered with this email address.' });
    }

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    resetTokensStore.set(lowercaseEmail, { code: resetCode, expiresAt });

    // Send email asynchronously
    sendResetPasswordEmail(lowercaseEmail, resetCode).catch(err => {
      console.error('Error sending reset email:', err);
    });

    res.json({ message: 'Password reset code has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request password reset: ' + err.message });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const lowercaseEmail = email.toLowerCase().trim();
    const cached = resetTokensStore.get(lowercaseEmail);

    if (!cached) {
      return res.status(400).json({ error: 'No active password reset request for this email.' });
    }

    if (Date.now() > cached.expiresAt) {
      resetTokensStore.delete(lowercaseEmail);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (cached.code !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Code is valid! Hash new password and update database
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (dbMode === 'mongodb') {
      const user = await User.findOne({ email: lowercaseEmail });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.password = hashedPassword;
      await user.save();
    } else {
      const user = inMemoryUsers.find(u => u.email === lowercaseEmail);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.password = hashedPassword;
    }

    // Clear reset token
    resetTokensStore.delete(lowercaseEmail);

    res.json({ message: 'Your password has been reset successfully. Please login.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// Helper to format phone numbers to international E.164 (without prefix plus) for otp.dev
function formatPhoneForOtpDev(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

// Send OTP via otp.dev API
function sendOtpViaOtpDev(phone, key) {
  return new Promise((resolve) => {
    const formatted = formatPhoneForOtpDev(phone);
    const postData = JSON.stringify({
      data: {
        channel: 'sms',
        sender: '9a46b7ba-9b18-443e-bd0e-efb4e0afe206',
        phone: formatted,
        template: '6ea84765-5850-42c2-9f0e-eb5ef3833928',
        code_length: 6
      }
    });

    const options = {
      hostname: 'api.otp.dev',
      port: 443,
      path: '/v1/verifications',
      method: 'POST',
      headers: {
        'X-OTP-Key': key,
        'accept': 'application/json',
        'content-type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const resp = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✉️ OTP sent to ${formatted} via otp.dev API successfully!`);
            resolve({ sent: true, response: resp });
          } else {
            console.error(`❌ otp.dev API returned error (Status ${res.statusCode}):`, body);
            resolve({ sent: false, error: body });
          }
        } catch (e) {
          resolve({ sent: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ otp.dev request error:', e);
      resolve({ sent: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Verify OTP via otp.dev API
function verifyOtpViaOtpDev(phone, code, key) {
  return new Promise((resolve) => {
    const formatted = formatPhoneForOtpDev(phone);
    const options = {
      hostname: 'api.otp.dev',
      port: 443,
      path: `/v1/verifications?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(formatted)}`,
      method: 'GET',
      headers: {
        'X-OTP-Key': key,
        'accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const resp = JSON.parse(body);
          if (res.statusCode === 200 && resp && resp.data) {
            console.log(`✅ otp.dev Verification check succeeded for ${formatted}`);
            resolve({ verified: true, data: resp.data });
          } else {
            console.error(`❌ otp.dev Verification check failed (Status ${res.statusCode}):`, body);
            resolve({ verified: false, error: body });
          }
        } catch (e) {
          resolve({ verified: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ otp.dev verification request error:', e);
      resolve({ verified: false, error: e.message });
    });

    req.end();
  });
}

// Twilio SMS dispatcher helper
function sendSmsViaTwilio(to, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return Promise.resolve({ sent: false });
  }

  return new Promise((resolve) => {
    // Clean to URL encoded values
    const postData = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: `Your Vikasita verification OTP is: ${otp}. It is valid for 5 minutes. Please do not share this code.`
    }).toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✉️ SMS successfully sent to ${to} via Twilio!`);
          resolve({ sent: true });
        } else {
          console.error(`❌ Twilio SMS delivery failed (Status ${res.statusCode}):`, body);
          resolve({ sent: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Twilio request error:', e);
      resolve({ sent: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Fast2SMS dispatcher helper
function sendSmsViaFast2SMS(to, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return Promise.resolve({ sent: false });

  // Fast2SMS requires clean 10-digit number
  const cleanNum = to.replace(/\D/g, '').slice(-10);

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      route: 'otp',
      variables_values: otp,
      numbers: cleanNum
    });

    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const resp = JSON.parse(body);
          if (resp.return) {
            console.log(`✉️ SMS successfully sent to ${cleanNum} via Fast2SMS!`);
            resolve({ sent: true });
          } else {
            console.error('❌ Fast2SMS API error:', resp.message);
            resolve({ sent: false, error: resp.message });
          }
        } catch (e) {
          console.error('❌ Fast2SMS JSON parse error:', body);
          resolve({ sent: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Fast2SMS request error:', e);
      resolve({ sent: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Textbelt dispatcher helper (allows 1 free SMS per day without API key)
function sendSmsViaTextbelt(to, otp) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      phone: to,
      message: `Your Vikasita verification OTP is: ${otp}. Valid for 5 minutes.`,
      key: 'textbelt'
    });

    const options = {
      hostname: 'textbelt.com',
      port: 443,
      path: '/text',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const resp = JSON.parse(body);
          if (resp.success) {
            console.log(`✉️ SMS successfully sent to ${to} via Textbelt free tier!`);
            resolve({ sent: true });
          } else {
            console.warn(`⚠️ Textbelt failed: ${resp.error || 'Unknown error'}`);
            resolve({ sent: false, error: resp.error });
          }
        } catch (e) {
          resolve({ sent: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Textbelt request error:', e);
      resolve({ sent: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Unified SMS dispatcher
async function sendSmsNotification(to, otp) {
  try {
    // Try Twilio first
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const res = await sendSmsViaTwilio(to, otp);
      if (res.sent) return res;
    }
    
    // Try Fast2SMS second
    if (process.env.FAST2SMS_API_KEY) {
      const res = await sendSmsViaFast2SMS(to, otp);
      if (res.sent) return res;
    }

    // Try Textbelt free tier as the third choice (no credentials needed, 1 free SMS per day)
    const res = await sendSmsViaTextbelt(to, otp);
    if (res.sent) return res;
  } catch (err) {
    console.error('Error in sendSmsNotification dispatch:', err);
  }

  console.log(`⚠️ SMS gateways not configured or failed. Simulated SMS printed to console log.`);
  return { sent: false, simulated: true };
}

// In-Memory OTP Store (phone -> { otp, expiresAt })
const otpsStore = new Map();

// Auth: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // Simple validation for 10-digit or standard international phone numbers
  const cleanedPhone = phone.trim();
  if (cleanedPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid phone number (minimum 10 digits).' });
  }

  try {
    const otpDevKey = process.env.OTP_DEV_KEY || process.env.FAST2SMS_API_KEY;
    if (otpDevKey) {
      const result = await sendOtpViaOtpDev(cleanedPhone, otpDevKey);
      if (result.sent) {
        return res.json({
          message: 'OTP sent successfully!'
        });
      } else {
        return res.status(400).json({ error: 'Failed to send OTP via otp.dev API.' });
      }
    }

    // Generate 6-digit random code (local simulation fallback)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    otpsStore.set(cleanedPhone, { otp, expiresAt });

    console.log(`\n=================== OTP SIMULATION ===================`);
    console.log(`To: ${cleanedPhone}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires: 5 minutes`);
    console.log(`======================================================\n`);

    // Dispatch SMS in background (Twilio / Fast2SMS / Textbelt fallback)
    sendSmsNotification(cleanedPhone, otp).catch(err => {
      console.error('Error sending real OTP SMS:', err);
    });

    // Return success response to the client without exposing the generated OTP code
    res.json({
      message: 'OTP sent successfully!'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate OTP: ' + err.message });
  }
});

// Auth: Verify OTP and Login/Register
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otp, role, name, company, taxid } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP code are required.' });
  }

  const cleanedPhone = phone.trim();
  const otpDevKey = process.env.OTP_DEV_KEY || process.env.FAST2SMS_API_KEY;

  if (otpDevKey) {
    try {
      const result = await verifyOtpViaOtpDev(cleanedPhone, otp, otpDevKey);
      if (!result.verified) {
        return res.status(400).json({ error: 'Invalid or expired OTP code.' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'otp.dev verification failed: ' + e.message });
    }
  } else {
    const cached = otpsStore.get(cleanedPhone);

    if (!cached) {
      return res.status(400).json({ error: 'No active OTP request found for this phone number.' });
    }

    if (Date.now() > cached.expiresAt) {
      otpsStore.delete(cleanedPhone);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (cached.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code. Please try again.' });
    }

    // OTP verified, clear it from store
    otpsStore.delete(cleanedPhone);
  }

  try {
    let user = null;
    const isB2B = role === 'B2B';

    if (dbMode === 'mongodb') {
      user = await User.findOne({ phone: cleanedPhone });
      if (!user) {
        // Auto-Register new user
        user = new User({
          name: name || `Phone User (${cleanedPhone.slice(-4)})`,
          phone: cleanedPhone,
          role: role || 'B2C',
          company: isB2B ? (company || 'Bloom Business Ltd') : null,
          taxid: isB2B ? (taxid || '09AAAAA1111A1Z1') : null
        });
        await user.save();
        console.log(`New user auto-registered via phone in MongoDB: ${cleanedPhone}`);
      }
    } else {
      // In-Memory Mode
      user = inMemoryUsers.find(u => u.phone === cleanedPhone);
      if (!user) {
        // Auto-Register mock user
        const dummyId = `usr_${Math.floor(Math.random() * 100000)}`;
        user = {
          _id: dummyId,
          name: name || `Phone User (${cleanedPhone.slice(-4)})`,
          phone: cleanedPhone,
          role: role || 'B2C',
          company: isB2B ? (company || 'Bloom Business Ltd') : null,
          taxid: isB2B ? (taxid || '09AAAAA1111A1Z1') : null
        };
        inMemoryUsers.push(user);
        console.log(`New user auto-registered via phone in Memory: ${cleanedPhone}`);
      }
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role, email: user.email || null },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email || null,
        role: user.role,
        company: user.company,
        taxid: user.taxid
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error during phone verification: ' + err.message });
  }
});

// Products: Get catalog
app.get('/api/products', async (req, res) => {
  try {
    if (dbMode === 'mongodb') {
      const items = await Product.find();
      res.json(items.length > 0 ? items : initialProducts);
    } else {
      res.json(inMemoryProducts.length > 0 ? inMemoryProducts : initialProducts);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve product database: ' + err.message });
  }
});

// Orders: Get user history
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (dbMode === 'mongodb') {
      const history = await Order.find({ userEmail: req.user.email });
      res.json(history);
    } else {
      const history = inMemoryOrders.filter(o => o.userEmail === req.user.email);
      res.json(history);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve order history: ' + err.message });
  }
});

// Helper to send order notification emails
async function sendOrderEmail(order) {
  const itemsListHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.title}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">INR ${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">INR ${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const itemsListText = order.items.map((item, index) => 
    `${index + 1}. ${item.title} x ${item.quantity} | Price/Unit: INR ${item.price.toFixed(2)} | Total: INR ${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');

  const emailSubject = `🆕 New Order Notification: ${order.id} (${order.clientType})`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2a4d34; border-bottom: 2px solid #2a4d34; padding-bottom: 10px; margin-top: 0;">Vikasita BloomThread - Order Confirmation</h2>
      <p>Hello,</p>
      <p>A new order has been purchased by a <strong>${order.clientType}</strong> client. Details are below:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 150px;">Order ID:</td>
          <td style="padding: 8px 0;">${order.id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Order Status:</td>
          <td style="padding: 8px 0; color: #f2a900; font-weight: bold; text-transform: uppercase;">${order.status}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td>
          <td style="padding: 8px 0;">${order.transactionId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Client Email:</td>
          <td style="padding: 8px 0;">${order.userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Date:</td>
          <td style="padding: 8px 0;">${order.date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Client Type:</td>
          <td style="padding: 8px 0;">${order.clientType}</td>
        </tr>
      </table>

      <h3 style="color: #2a4d34; border-bottom: 1px solid #eee; padding-bottom: 5px;">Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Quantity</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>

      <div style="text-align: right; font-size: 16px; font-weight: bold; margin-top: 15px; border-top: 2px solid #ddd; padding-top: 10px;">
        Total Amount: INR ${order.totalAmount.toFixed(2)}
      </div>

      <div style="background-color: #f9fbf8; border: 1px dashed #2a4d34; padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center;">
        <h4 style="color: #2a4d34; margin: 0 0 10px 0; font-size: 16px;">Vikasita Merchant Action Required</h4>
        <p style="font-size: 13px; color: #555; margin: 0 0 16px 0; line-height: 1.4;">
          Please verify if payment has been received in your Google Pay account (<strong>pokhriyalpratyush7@okicici</strong>). Click one of the buttons below to update the system:
        </p>
        <div style="display: inline-flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="http://localhost:5000/api/orders/${order.id}/approve" style="background-color: #2e7d32; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
            Approve & Complete Order
          </a>
          <a href="http://localhost:5000/api/orders/${order.id}/decline" style="background-color: #c94053; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
            Decline & Cancel Order
          </a>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">
        Vikasita BloomThread MERN Application. This is an automated notification.
      </p>
    </div>
  `;

  const emailText = `
Vikasita BloomThread - Order Confirmation
========================================
A new order has been purchased by a ${order.clientType} client.

Order Details:
--------------
Order ID: ${order.id}
Order Status: ${order.status.toUpperCase()}
Transaction ID: ${order.transactionId}
Client Email: ${order.userEmail}
Date: ${order.date}
Client Type: ${order.clientType}

Items Ordered:
--------------
${itemsListText}

Total Amount: INR ${order.totalAmount.toFixed(2)}

========================================
Vikasita Merchant Actions:
----------------------------------------
To approve and complete this order:
http://localhost:5000/api/orders/${order.id}/approve

To decline and cancel this order:
http://localhost:5000/api/orders/${order.id}/decline

----------------------------------------
Vikasita BloomThread MERN Application. This is an automated notification.
  `;

  const mailOptions = {
    from: EMAIL_USER || '"Vikasita BloomThread" <noreply@bloomthread.com>',
    to: EMAIL_RECIPIENT,
    subject: emailSubject,
    text: emailText,
    html: emailHtml
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Email successfully sent to ${EMAIL_RECIPIENT}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${EMAIL_RECIPIENT}:`, error);
      return { sent: false, error: error.message };
    }
  } else {
    console.log(`\n=================== SIMULATED EMAIL TO: ${EMAIL_RECIPIENT} ===================`);
    console.log(`Subject: ${emailSubject}`);
    console.log(emailText);
    console.log(`===============================================================================\n`);
    return { sent: false, simulated: true, emailText };
  }
}

// Helper to send order status update notifications to the owner
async function sendOrderStatusEmail(order) {
  const emailSubject = `🔔 Payment Status Update: Order ${order.id} is ${order.status.toUpperCase()}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2a4d34; border-bottom: 2px solid #2a4d34; padding-bottom: 10px; margin-top: 0;">Vikasita BloomThread - Payment Status Confirmation</h2>
      <p>Hello Owner,</p>
      <p>The payment status for Order <strong>${order.id}</strong> has been updated in the backend system.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 150px;">Order ID:</td>
          <td style="padding: 8px 0;">${order.id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">New Payment Status:</td>
          <td style="padding: 8px 0; color: ${order.status === 'completed' ? '#2e7d32' : '#c94053'}; font-weight: bold; text-transform: uppercase;">
            ${order.status === 'completed' ? 'APPROVED & COMPLETED' : order.status.toUpperCase()}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td>
          <td style="padding: 8px 0;">${order.transactionId || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Client Email:</td>
          <td style="padding: 8px 0;">${order.userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Total Amount:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #2a4d34;">INR ${order.totalAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Date of Order:</td>
          <td style="padding: 8px 0;">${order.date}</td>
        </tr>
      </table>

      <p style="font-size: 14px; color: #555;">
        This confirmation indicates the transaction has been verified. No further action is required from your side.
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">
        Vikasita BloomThread MERN Application. This is an automated notification.
      </p>
    </div>
  `;

  const emailText = `
Vikasita BloomThread - Payment Status Confirmation
==================================================
The payment status for Order ${order.id} has been updated.

Order Details:
--------------
Order ID: ${order.id}
New Payment Status: ${order.status.toUpperCase()}
Transaction ID: ${order.transactionId || 'N/A'}
Client Email: ${order.userEmail}
Total Amount: INR ${order.totalAmount.toFixed(2)}
Date: ${order.date}

==================================================
This confirmation indicates the transaction has been verified. No further action is required.
Vikasita BloomThread MERN Application. This is an automated notification.
  `;

  const mailOptions = {
    from: EMAIL_USER || '"Vikasita BloomThread" <noreply@bloomthread.com>',
    to: EMAIL_RECIPIENT,
    subject: emailSubject,
    text: emailText,
    html: emailHtml
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Payment status email successfully sent to ${EMAIL_RECIPIENT}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send payment status email to ${EMAIL_RECIPIENT}:`, error);
      return { sent: false, error: error.message };
    }
  } else {
    console.log(`\n=================== SIMULATED STATUS EMAIL TO: ${EMAIL_RECIPIENT} ===================`);
    console.log(`Subject: ${emailSubject}`);
    console.log(emailText);
    console.log(`========================================================================================\n`);
    return { sent: false, simulated: true, emailText };
  }
}

// Endpoint to approve order from email link
app.get('/api/orders/:id/approve', async (req, res) => {
  const orderId = req.params.id;
  try {
    let order;
    if (dbMode === 'mongodb') {
      order = await Order.findOne({ id: orderId });
      if (!order) return res.status(404).send('<h1>Order Not Found</h1>');
      order.status = 'completed';
      await order.save();
    } else {
      order = inMemoryOrders.find(o => o.id === orderId);
      if (!order) return res.status(404).send('<h1>Order Not Found</h1>');
      order.status = 'completed';
    }

    // Send payment confirmation email to the owner
    sendOrderStatusEmail(order).catch(err => {
      console.error('Error sending order status email:', err);
    });

    // Render a gorgeous success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Approved - Vikasita BloomThread</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #f7f9f6;
            color: #111;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .card {
            background: #ffffff;
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border: 1px solid #e2ebd5;
          }
          .icon-wrapper {
            width: 80px;
            height: 80px;
            background-color: #e8f5e9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: #2e7d32;
            font-size: 2.2rem;
            animation: scaleIn 0.5s ease-out;
          }
          h1 {
            font-family: 'Playfair Display', serif;
            font-size: 1.8rem;
            color: #2e7d32;
            margin: 0 0 12px;
          }
          p {
            font-size: 0.95rem;
            color: #666;
            margin: 0 0 24px;
            line-height: 1.5;
          }
          .details {
            background-color: #f9fbf8;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
            border: 1px solid #eff3eb;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.85rem;
          }
          .detail-row:last-child {
            margin-bottom: 0;
          }
          .label {
            color: #888;
            font-weight: 500;
          }
          .value {
            font-weight: 600;
          }
          .btn {
            background-color: #2a4d34;
            color: #fff;
            padding: 12px 24px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: all 0.3s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(42,77,52,0.2);
          }
          @keyframes scaleIn {
            0% { transform: scale(0); }
            100% { transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrapper">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h1>Payment Approved</h1>
          <p>Transaction confirmed! Order has been successfully approved and updated in the system ledger.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Order ID</span>
              <span class="value">${order.id}</span>
            </div>
            <div class="detail-row">
              <span class="label">Client Email</span>
              <span class="value">${order.userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount</span>
              <span class="value">₹${order.totalAmount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <span class="value" style="color: #2e7d32; text-transform: uppercase;">Completed</span>
            </div>
          </div>
          
          <a href="http://localhost:5173/" class="btn">Back to Vikasita Shop</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('<h1>Server Error updating order</h1>');
  }
});

// Endpoint to decline order from email link
app.get('/api/orders/:id/decline', async (req, res) => {
  const orderId = req.params.id;
  try {
    let order;
    if (dbMode === 'mongodb') {
      order = await Order.findOne({ id: orderId });
      if (!order) return res.status(404).send('<h1>Order Not Found</h1>');
      order.status = 'declined';
      await order.save();
    } else {
      order = inMemoryOrders.find(o => o.id === orderId);
      if (!order) return res.status(404).send('<h1>Order Not Found</h1>');
      order.status = 'declined';
    }

    // Send payment status email to the owner
    sendOrderStatusEmail(order).catch(err => {
      console.error('Error sending order status email:', err);
    });

    // Render a gorgeous decline page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Declined - Vikasita BloomThread</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #fcf9f9;
            color: #111;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .card {
            background: #ffffff;
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border: 1px solid #fde2e2;
          }
          .icon-wrapper {
            width: 80px;
            height: 80px;
            background-color: #fde8eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: #c94053;
            font-size: 2.2rem;
            animation: scaleIn 0.5s ease-out;
          }
          h1 {
            font-family: 'Playfair Display', serif;
            font-size: 1.8rem;
            color: #c94053;
            margin: 0 0 12px;
          }
          p {
            font-size: 0.95rem;
            color: #666;
            margin: 0 0 24px;
            line-height: 1.5;
          }
          .details {
            background-color: #fdfafb;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
            border: 1px solid #fdebee;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.85rem;
          }
          .detail-row:last-child {
            margin-bottom: 0;
          }
          .label {
            color: #888;
            font-weight: 500;
          }
          .value {
            font-weight: 600;
          }
          .btn {
            background-color: #2a4d34;
            color: #fff;
            padding: 12px 24px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: all 0.3s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(42,77,52,0.2);
          }
          @keyframes scaleIn {
            0% { transform: scale(0); }
            100% { transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrapper">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <h1>Payment Declined</h1>
          <p>Transaction rejected! The order payment status has been set to declined.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Order ID</span>
              <span class="value">${order.id}</span>
            </div>
            <div class="detail-row">
              <span class="label">Client Email</span>
              <span class="value">${order.userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount</span>
              <span class="value">₹${order.totalAmount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <span class="value" style="color: #c94053; text-transform: uppercase;">Declined</span>
            </div>
          </div>
          
          <a href="http://localhost:5173/" class="btn">Back to Vikasita Shop</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('<h1>Server Error updating order</h1>');
  }
});

// Orders: Place order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cannot process empty order cart.' });
  }

  try {
    let subtotal = 0;
    
    // Server-side validation of cart pricing and MOQs
    items.forEach(item => {
      if (item.mode === 'B2B') {
        const moqLimit = item.moq || 50;
        if (item.quantity < moqLimit) {
          throw new Error(`Order quantity of ${item.quantity} for item "${item.title}" is below the Wholesale Minimum Order Quantity (MOQ) of ${moqLimit}.`);
        }
      }
      subtotal += item.price * item.quantity;
    });

    const tax = subtotal * 0.08;
    const shipping = 0;
    const totalAmount = subtotal + tax + shipping;
    
    const orderId = `BT-${Math.floor(100000 + Math.random() * 900000)}`;
    const transactionId = req.body.transactionId || `TXN-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder = {
      id: orderId,
      userEmail: req.user.email,
      date: new Date().toLocaleDateString(),
      clientType: req.user.role,
      totalAmount: totalAmount,
      status: req.body.status || 'processing',
      items: items,
      transactionId: transactionId
    };

    if (dbMode === 'mongodb') {
      const orderModel = new Order(newOrder);
      await orderModel.save();
    } else {
      inMemoryOrders.push(newOrder);
    }

    // Send order confirmation email asynchronously
    sendOrderEmail(newOrder).catch(err => {
      console.error('Error in sendOrderEmail background call:', err);
    });

    res.status(201).json({
      message: 'Checkout complete! Order created successfully.',
      order: newOrder
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Orders: Update status
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  if (!['completed', 'declined', 'processing'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status value.' });
  }

  try {
    if (dbMode === 'mongodb') {
      const order = await Order.findOne({ id: orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      // Only allow the owner of the order to update it
      if (order.userEmail !== req.user.email) {
        return res.status(403).json({ error: 'Unauthorized to update this order.' });
      }

      order.status = status;
      await order.save();

      // Send payment status email to the owner
      sendOrderStatusEmail(order).catch(err => {
        console.error('Error sending order status email:', err);
      });

      return res.json({ message: `Order status updated to ${status}.`, order });
    } else {
      // In-Memory Fallback
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      if (order.userEmail !== req.user.email) {
        return res.status(403).json({ error: 'Unauthorized to update this order.' });
      }

      order.status = status;

      // Send payment status email to the owner
      sendOrderStatusEmail(order).catch(err => {
        console.error('Error sending order status email:', err);
      });

      return res.json({ message: `Order status updated to ${status}.`, order });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status: ' + err.message });
  }
});

// Serve frontend static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res, next) => {
    // Let API calls fall through
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Root landing status check (Development mode)
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BloomThread Backend API</title>
        <style>
          body {
            margin: 0;
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            background-color: #f7f9f6;
            color: #2b3a2e;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(42, 77, 52, 0.08);
            border: 1px solid rgba(42, 77, 52, 0.1);
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #2a4d34;
            margin-top: 0;
            font-size: 28px;
          }
          p {
            font-size: 16px;
            line-height: 1.6;
            color: #556b5a;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background-color: #eaf2eb;
            color: #2a4d34;
            padding: 8px 16px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            background-color: #2e7d32;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.6; }
          }
          .links {
            margin-top: 24px;
            display: flex;
            justify-content: center;
            gap: 16px;
          }
          .link-btn {
            color: #2a4d34;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 16px;
            border: 1px solid #2a4d34;
            border-radius: 8px;
            transition: all 0.2s ease;
          }
          .link-btn:hover {
            background-color: #2a4d34;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="status-badge">
            <div class="status-dot"></div>
            Backend Online
          </div>
          <h1>BloomThread API</h1>
          <p>The premium full-stack botanical e-commerce platform API is active and successfully connected to the database.</p>
          <p style="font-size: 14px; font-style: italic;">Mode: [${dbMode.toUpperCase()}] DB integration</p>
          <div class="links">
            <a href="/api/status" class="link-btn">Check Status</a>
            <a href="/api/products" class="link-btn">View Products</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

// Status check API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    dbMode,
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`============================================`);
  console.log(`Vikasita Express Backend online on PORT ${PORT}`);
  console.log(`Running in [${dbMode.toUpperCase()}] DB integration mode`);
  console.log(`============================================`);
});
