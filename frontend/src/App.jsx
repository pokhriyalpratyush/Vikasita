import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Default mock assets inside import paths
import dressImg from './assets/ecoprint_dress.png';
import shirtImg from './assets/ecoprint_shirt.png';
import sareeImg from './assets/saree.png';
import newShirtImg from './assets/shirt.png';
import silkFabricImg from './assets/silk_fabric.png';
import organzaFabricImg from './assets/organza_fabric.png';
import chanderiFabricImg from './assets/chanderi_fabric.png';
import cottonLinenFabricImg from './assets/cotton_linen_fabric.png';
import kotaSilkFabricImg from './assets/kota_silk_fabric.png';
import gauzeCottonFabricImg from './assets/gauze_cotton_fabric.png';
import mulberrySilkFabricImg from './assets/mulberry_silk_fabric.png';
import cottonSatinFabricImg from './assets/cotton_satin_fabric.png';
import logoImg from './assets/logo.jpg';
import marigoldsHeroImg from './assets/marigolds_hero.png';
import jaimalaImg from './assets/jaimala.png';
import fabricPrepImg from './assets/fabric_prep.png';
import sourceArrangeImg from './assets/source_arrange.png';
import rollingBindingImg from './assets/rolling_binding.png';
import steamingBundleImg from './assets/steaming_bundle.png';
import unveilingRinsingImg from './assets/unveiling_rinsing.png';
import processOverallImg from './assets/process_overall.png';
import habotaiSareeImg from './assets/habotai_saree.png';
import lisaStoleImg from './assets/lisa_stole.png';
import cottonLinenSareeImg from './assets/cotton_linen_saree.png';
import chanderiSareeImg from './assets/chanderi_saree.png';
import sheenSilkSareeImg from './assets/sheen_silk_saree.png';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const fabricDisplayNames = {
  organza: 'Organza Silk',
  chanderi: 'Luxurious Chanderi',
  cotton_linen: 'Cotton Linen',
  kota_silk: 'Exquisite Kota Silk',
  gauze_cotton: 'Organic Gauze Cotton',
  mulberry_silk: 'Organic Mulberry Silk',
  cotton_satin: 'Organic Cotton-Satin'
};

const flowerDisplayNames = {
  marigold: 'Marigold',
  rose: 'Rose Petals',
  eucalyptus: 'Eucalyptus',
  mixed: 'Mixed Bloom'
};

function App() {
  // Navigation & View Router States
  const [activeView, setActiveView] = useState('home');
  const [shopMode, setShopMode] = useState('B2C');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dashboardTab, setDashboardTab] = useState('orders');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Database States
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('vikasita_cart')) || []);
  const [orders, setOrders] = useState([]);

  // Auth States
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('vikasita_user')) || null);
  const [token, setToken] = useState(() => localStorage.getItem('vikasita_token') || null);
  
  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRole, setAuthRole] = useState('B2C'); // 'B2C' or 'B2B'
  const [authSubtab, setAuthSubtab] = useState('login'); // 'login' or 'signup'
  const [authFields, setAuthFields] = useState({ name: '', email: '', password: '', phone: '', company: '', taxid: '' });
  
  // Phone Auth States
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [phoneField, setPhoneField] = useState('');
  const [otpField, setOtpField] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState('');

  // Customizer Workshop States
  const [customFabric, setCustomFabric] = useState('organza');
  const [customFlower, setCustomFlower] = useState('marigold');
  const [customDensity, setCustomDensity] = useState(30);
  const canvasRef = useRef(null);

  // Bulk Calculator States
  const [calcQty, setCalcQty] = useState(200);

  // Toast System State
  const [toasts, setToasts] = useState([]);

  // Payment Gateway States
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'qr'
  const [paymentFields, setPaymentFields] = useState({ cardNumber: '', cardExpiry: '', cardCvv: '', cardName: '', upiId: '' });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentDeciding, setPaymentDeciding] = useState(false);
  const [tempTxnId, setTempTxnId] = useState('');
  const [statusCheckOrder, setStatusCheckOrder] = useState(null);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);
  const [paymentTimer, setPaymentTimer] = useState(60);

  // Countdown timer for payment gateway
  useEffect(() => {
    let interval = null;
    if (showPaymentGateway && !isPaymentProcessing && selectedPaymentMethod === 'qr') {
      setPaymentTimer(60);
      interval = setInterval(() => {
        setPaymentTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowPaymentGateway(false);
            showToast('Transaction declined: payment timeout.', 'B2C');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showPaymentGateway, isPaymentProcessing, selectedPaymentMethod]);

  const deliveryDistance = 150; // Default distance 150 km

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else if (res.status === 401 || res.status === 403) {
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('vikasita_user');
        localStorage.removeItem('vikasita_token');
        setShopMode('B2C');
        setActiveView('home');
        showToast('Session expired. Please sign in again.');
      }
    } catch (err) {
      console.warn('Backend order fetch offline, reading from localStorage.', err);
      const localOrders = JSON.parse(localStorage.getItem('vikasita_orders')) || [];
      setOrders(localOrders);
    }
  }, [token]);

  // --- INTERACTIVE CUSTOMIZER CANVAS DRAW ---
  const drawCustomizerCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas styling properties depending on base fabric
    let fabricBg = '#ffffff';
    if (customFabric === 'organza') fabricBg = '#fff6cf';
    else if (customFabric === 'chanderi') fabricBg = '#ffc324';
    else if (customFabric === 'cotton_linen') fabricBg = '#f9f8f4';
    else if (customFabric === 'kota_silk') fabricBg = '#eef0f3';
    else if (customFabric === 'gauze_cotton') fabricBg = '#ffd5c6';
    else if (customFabric === 'mulberry_silk') fabricBg = '#e2d2ec';
    else if (customFabric === 'cotton_satin') fabricBg = '#ffa088';

    ctx.fillStyle = fabricBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw fabric thread weaves
    ctx.strokeStyle = 'rgba(42, 77, 52, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 6) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Seed Random to maintain print styling during slider updates
    let seed = 42;
    const random = () => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Draw customized botanical print marks on canvas
    const drawFlowerStamp = (x, y, size, color, flowerType) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;

      if (flowerType === 'marigold') {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const angle = (i * Math.PI) / 3.5;
          ctx.arc(x + Math.cos(angle) * (size * 0.4), y + Math.sin(angle) * (size * 0.4), size * 0.3, 0, Math.PI * 2);
        }
        ctx.fill();
      } else if (flowerType === 'rose') {
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.bezierCurveTo(x - size * 0.6, y - size * 0.4, x - size * 0.2, y - size * 0.8, x, y - size * 0.3);
        ctx.bezierCurveTo(x + size * 0.2, y - size * 0.8, x + size * 0.6, y - size * 0.4, x, y + size * 0.3);
        ctx.fill();
      } else if (flowerType === 'eucalyptus') {
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.6, size * 0.28, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(x - size * 0.4, y);
        ctx.lineTo(x + size * 0.4, y);
        ctx.stroke();
      }
    };

    const dyes = {
      marigold: ['#e59e19', '#d8810f', '#f4bc42', '#ab6107'],
      rose: ['#c94053', '#ab2a3c', '#d36978', '#7c1623'],
      eucalyptus: ['#65856c', '#4d6953', '#80a388', '#b8c9bc'],
      mixed: ['#e59e19', '#c94053', '#65856c', '#d8810f']
    };

    const palette = dyes[customFlower];

    for (let k = 0; k < customDensity; k++) {
      const rx = random() * (canvas.width - 60) + 30;
      const ry = random() * (canvas.height - 60) + 30;
      const rSize = random() * 24 + 18;
      const rColor = palette[Math.floor(random() * palette.length)];
      
      const type = customFlower === 'mixed'
        ? ['marigold', 'rose', 'eucalyptus'][Math.floor(random() * 3)]
        : customFlower;

      drawFlowerStamp(rx, ry, rSize, rColor, type);
    }
  }, [customFabric, customFlower, customDensity]);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('vikasita_cart', JSON.stringify(cart));
  }, [cart]);

  // Listen for query params for password reset links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    const email = params.get('email');
    if (resetToken && email) {
      setAuthFields(p => ({ ...p, email: email, password: '' }));
      setPhoneField('');
      setOtpField(resetToken);
      setAuthSubtab('reset-password');
      setAuthMethod('email');
      setShowAuthModal(true);
      
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  }, []);

  // Fetch products catalog & orders on load or login
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/products`);
        if (res.ok) {
          const data = await res.json();
          // Replace image URLs with resolved React imports
          const normalized = data.map(p => ({
            ...p,
            image: p.id === 'prod_rose_saree' ? sareeImg : 
                   p.id === 'prod_rose_shirt' ? newShirtImg : 
                   p.id === 'prod_habotai_saree' ? habotaiSareeImg : 
                   p.id === 'prod_lisa_stole' ? lisaStoleImg : 
                   p.id === 'prod_cotton_linen_saree' ? cottonLinenSareeImg : 
                   p.id === 'prod_chanderi_saree' ? chanderiSareeImg : 
                   p.id === 'prod_sheen_silk_saree' ? sheenSilkSareeImg : 
                   (p.id.includes('shirt') || p.id.includes('tote') ? shirtImg : dressImg)
          }));
          setProducts(normalized);
        } else {
          throw new Error('Failed to load products');
        }
      } catch (err) {
        console.warn('Backend offline, using mock products catalog.', err);
        // Local fallback catalog
        const fallback = [
          {
            id: 'prod_rose_saree',
            title: 'Rose Print Premium Silk Saree',
            description: 'Exquisite hand-woven Banarasi silk saree eco-printed with discarded temple red roses. Natural alum mordanted, zero chemical dyes.',
            category: 'rose',
            image: sareeImg,
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
            image: newShirtImg,
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
            image: dressImg,
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
            image: shirtImg,
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
            image: habotaiSareeImg,
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
            image: lisaStoleImg,
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
            image: cottonLinenSareeImg,
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
            image: chanderiSareeImg,
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
            image: sheenSilkSareeImg,
            b2cPrice: 13500.00,
            b2bPrice: 5400.00,
            moq: 50,
            ecoWater: 920,
            ecoFlowers: 4.5
          }
        ];
        setProducts(fallback);
      }
    };

    fetchProducts();
    if (currentUser && token) {
      fetchOrders();
    }
  }, [currentUser, token, fetchOrders]);

  // Sync canvas drawing on customizer param changes
  useEffect(() => {
    if (activeView === 'customizer') {
      drawCustomizerCanvas();
    }
  }, [activeView, drawCustomizerCanvas]);

  const showToast = (message, type = 'B2C') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleSendOtp = async () => {
    if (!phoneField.trim()) {
      showToast('Please enter a valid phone number', 'B2C');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneField })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        // If the server returns OTP in response (dev/simulated mode), show it in toast
        if (data.otp) {
          showToast(`OTP Sent! (Simulated code: ${data.otp})`, 'B2B');
        } else {
          showToast('OTP Sent successfully to your phone.', 'B2C');
        }
      } else {
        showToast(data.error || 'Failed to send OTP.', 'B2C');
      }
    } catch (err) {
      console.warn('Backend Auth offline. Simulating phone OTP send locally.', err);
      // Local demo mode simulation
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedOtp(randomOtp);
      setOtpSent(true);
      showToast(`[Demo Mode] OTP sent! Simulated code: ${randomOtp}`, 'B2B');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpField.trim()) {
      showToast('Please enter the verification code', 'B2C');
      return;
    }
    setOtpVerifyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneField,
          otp: otpField,
          role: authRole,
          name: authFields.name,
          company: authFields.company,
          taxid: authFields.taxid
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem('vikasita_user', JSON.stringify(data.user));
        localStorage.setItem('vikasita_token', data.token);
        
        setShowAuthModal(false);
        setPhoneField('');
        setOtpField('');
        setOtpSent(false);
        setAuthFields({ name: '', email: '', password: '', phone: '', company: '', taxid: '' });
        showToast(`Authenticated via Phone! Welcome, ${data.user.name}`, data.user.role === 'B2B' ? 'B2B' : 'B2C');
        
        setShopMode(data.user.role === 'B2B' ? 'B2B' : 'B2C');
      } else {
        showToast(data.error || 'Invalid or expired OTP code', 'B2C');
      }
    } catch (err) {
      console.warn('Backend Auth offline. Simulating local OTP verification.', err);
      
      // Verification logic for local simulation
      if (otpField === simulatedOtp || otpField === '123456') {
        const localUsers = JSON.parse(localStorage.getItem('vikasita_users')) || [];
        
        // Find existing phone user or register mock user
        let matched = localUsers.find(u => u.phone === phoneField);
        if (!matched) {
          matched = {
            name: authFields.name || `Phone User (${phoneField.slice(-4)})`,
            phone: phoneField,
            email: null,
            role: authRole,
            company: authRole === 'B2B' ? (authFields.company || 'Bloom Business Ltd') : null,
            taxid: authRole === 'B2B' ? (authFields.taxid || '09AAAAA1111A1Z1') : null
          };
          localUsers.push(matched);
          localStorage.setItem('vikasita_users', JSON.stringify(localUsers));
        }

        setCurrentUser(matched);
        setToken('dummy_token_123');
        localStorage.setItem('vikasita_user', JSON.stringify(matched));
        localStorage.setItem('vikasita_token', 'dummy_token_123');

        setShowAuthModal(false);
        setPhoneField('');
        setOtpField('');
        setOtpSent(false);
        setAuthFields({ name: '', email: '', password: '', phone: '', company: '', taxid: '' });
        showToast(`[Demo Mode] Logged in as ${matched.name}`, matched.role === 'B2B' ? 'B2B' : 'B2C');
        setShopMode(matched.role === 'B2B' ? 'B2B' : 'B2C');
      } else {
        showToast('Invalid simulated OTP code.', 'B2C');
      }
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authSubtab === 'login' ? 'login' : 'register';
    const payload = authSubtab === 'login' 
      ? { email: authFields.email, password: authFields.password, role: authRole }
      : { ...authFields, role: authRole };

    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        // Authenticated successfully
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem('vikasita_user', JSON.stringify(data.user));
        localStorage.setItem('vikasita_token', data.token);
        
        setShowAuthModal(false);
        setAuthFields({ name: '', email: '', password: '', phone: '', company: '', taxid: '' });
        showToast(`Authenticated as ${data.user.name} (${data.user.role === 'B2B' ? 'Business' : 'Customer'})`, data.user.role === 'B2B' ? 'B2B' : 'B2C');
        
        if (data.user.role === 'B2B') {
          setShopMode('B2B');
        } else {
          setShopMode('B2C');
        }
      } else {
        showToast(data.error || 'Authentication error occurred', 'B2C');
      }
    } catch (err) {
      // Mock local connection bypass
      console.warn('Backend Auth offline. Simulating local auth persistence.', err);
      const localUsers = JSON.parse(localStorage.getItem('vikasita_users')) || [];
      
      if (authSubtab === 'login') {
        const matched = localUsers.find(u => u.email.toLowerCase() === authFields.email.toLowerCase());
        const mockUser = matched || {
          name: authFields.email.split('@')[0],
          email: authFields.email,
          role: authRole,
          company: authRole === 'B2B' ? 'Ganga Boutique' : null,
          taxid: authRole === 'B2B' ? '09GSTIN12345' : null
        };
        
        if (!matched) {
          localUsers.push(mockUser);
          localStorage.setItem('vikasita_users', JSON.stringify(localUsers));
        }

        setCurrentUser(mockUser);
        setToken('dummy_token_123');
        localStorage.setItem('vikasita_user', JSON.stringify(mockUser));
        localStorage.setItem('vikasita_token', 'dummy_token_123');
        
        setShowAuthModal(false);
        showToast(`Logged in locally as ${mockUser.name}`, mockUser.role === 'B2B' ? 'B2B' : 'B2C');
        setShopMode(mockUser.role === 'B2B' ? 'B2B' : 'B2C');
      } else {
        // Sign up simulation
        const mockUser = {
          name: authFields.name,
          email: authFields.email,
          phone: authFields.phone || null,
          role: authRole,
          company: authRole === 'B2B' ? authFields.company : null,
          taxid: authRole === 'B2B' ? authFields.taxid : null
        };
        localUsers.push(mockUser);
        localStorage.setItem('vikasita_users', JSON.stringify(localUsers));
        
        setCurrentUser(mockUser);
        setToken('dummy_token_123');
        localStorage.setItem('vikasita_user', JSON.stringify(mockUser));
        localStorage.setItem('vikasita_token', 'dummy_token_123');
        
        setShowAuthModal(false);
        showToast(`Account registered locally for ${mockUser.name}`, mockUser.role === 'B2B' ? 'B2B' : 'B2C');
        setShopMode(mockUser.role === 'B2B' ? 'B2B' : 'B2C');
      }
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!authFields.email.trim()) {
      showToast('Please enter your registered email address.', 'B2C');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authFields.email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'B2C');
        setAuthSubtab('reset-password');
      } else {
        showToast(data.error || 'Failed to send reset link.', 'B2C');
      }
    } catch (err) {
      console.warn('Backend offline, simulating forgot password code send.', err);
      showToast('Backend offline. Reset code simulated: "123456" logged to console.', 'B2B');
      console.log('SIMULATED RESET CODE: 123456 for email: ' + authFields.email);
      setOtpField('123456');
      setAuthSubtab('reset-password');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const code = otpField;
    if (!authFields.email || !code || !authFields.password) {
      showToast('Please fill in all fields.', 'B2C');
      return;
    }
    if (authFields.password.length < 6) {
      showToast('New password must be at least 6 characters.', 'B2C');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authFields.email,
          code: code,
          newPassword: authFields.password
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'B2C');
        setAuthFields(p => ({ ...p, password: '' }));
        setOtpField('');
        setAuthSubtab('login');
      } else {
        showToast(data.error || 'Failed to reset password.', 'B2C');
      }
    } catch (err) {
      console.warn('Backend offline, simulating password reset.', err);
      if (code === '123456') {
        const localUsers = JSON.parse(localStorage.getItem('vikasita_users')) || [];
        const idx = localUsers.findIndex(u => u.email.toLowerCase() === authFields.email.toLowerCase());
        if (idx > -1) {
          showToast('Password reset successful (simulated).', 'B2C');
          setAuthFields(p => ({ ...p, password: '' }));
          setOtpField('');
          setAuthSubtab('login');
        } else {
          showToast('User not found in local registration memory.', 'B2C');
        }
      } else {
        showToast('Invalid reset verification code.', 'B2C');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('vikasita_user');
    localStorage.removeItem('vikasita_token');
    setShopMode('B2C');
    setActiveView('home');
    showToast('Logged out successfully.');
  };

  // --- CART OPERATIONS ---
  const addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const isB2B = shopMode === 'B2B';
    const quantity = isB2B ? product.moq : 1;
    const price = isB2B ? product.b2bPrice : product.b2cPrice;
    
    const cartKey = `${productId}_${shopMode}`;
    
    setCart(prev => {
      const idx = prev.findIndex(item => item.cartKey === cartKey);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      } else {
        return [...prev, {
          cartKey,
          productId,
          title: product.title,
          price,
          quantity,
          image: product.image,
          mode: shopMode,
          isCustom: false,
          moq: isB2B ? product.moq : 1,
          ecoWater: product.ecoWater,
          ecoFlowers: product.ecoFlowers
        }];
      }
    });

    showToast(`Added ${product.title} to Cart`, shopMode === 'B2B' ? 'B2B' : 'B2C');
  };

  const updateCartQty = (index, delta) => {
    const copy = [...cart];
    const item = copy[index];
    const newQty = item.quantity + delta;

    if (newQty < item.moq) {
      showToast(`Wholesale MOQ is ${item.moq} items. Cannot order below this.`, 'B2C');
      return;
    }

    item.quantity = newQty;
    setCart(copy);
  };

  const removeCartItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    showToast('Removed item from cart.');
  };

  const getShippingFee = (itemsList = cart) => {
    const list = Array.isArray(itemsList) ? itemsList : cart;
    const hasShirt = list.some(item => 
      item.productId.toLowerCase().includes('shirt') || 
      item.title.toLowerCase().includes('shirt')
    );
    return hasShirt ? 1.00 : 0.00;
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = getShippingFee(cart);
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const ecoFlowers = cart.reduce((sum, i) => sum + (i.ecoFlowers || 0.5) * i.quantity, 0);
    const ecoWater = cart.reduce((sum, i) => sum + (i.ecoWater || 100) * i.quantity, 0);

    return { subtotal, shipping, tax, total, ecoFlowers, ecoWater };
  };

  const processCheckout = async () => {
    const hasB2B = cart.some(item => item.mode === 'B2B');
    if (hasB2B && (!currentUser || currentUser.role !== 'B2B')) {
      showToast('B2B checkouts require businessman login validation.', 'B2C');
      setAuthRole('B2B');
      setShowAuthModal(true);
      return;
    }

    if (!currentUser) {
      showToast('Please sign in to place your checkout order.');
      setAuthRole(hasB2B ? 'B2B' : 'B2C');
      setShowAuthModal(true);
      return;
    }

    // Launch Vikasita Unified Payment Gateway Modal
    setShowPaymentGateway(true);
  };

  const downloadReceipt = (order) => {
    let itemsText = '';
    let totalWater = 0;
    let totalFlowers = 0;

    order.items.forEach((item, idx) => {
      const isCustom = item.isCustom;
      const details = isCustom 
        ? `Custom Design (Fabric: ${fabricDisplayNames[item.fabric] || item.fabric}, Flower: ${flowerDisplayNames[item.flower] || item.flower})` 
        : `Category: ${item.category}`;
      itemsText += `${idx + 1}. ${item.title} x ${item.quantity}\n`;
      itemsText += `   Price/Unit: INR ${item.price.toFixed(2)} | Total: INR ${(item.price * item.quantity).toFixed(2)}\n`;
      itemsText += `   Mode: ${item.mode} | ${details}\n\n`;
      
      totalWater += (item.ecoWater || 100) * item.quantity;
      totalFlowers += (item.ecoFlowers || 0.5) * item.quantity;
    });

    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08;
    const shipping = getShippingFee(order.items);
    const grandTotal = subtotal + tax + shipping;

    const content = `============================================================
                  VIKASITA APPAREL RECEIPT
============================================================
Order ID:       ${order.id}
Date:           ${order.date}
Client Type:    ${order.clientType === 'B2B' ? 'Wholesale Partner (B2B)' : 'Retail Customer (B2C)'}
Email:          ${currentUser ? currentUser.email : order.userEmail || 'N/A'}
Transaction ID: ${order.transactionId || 'N/A'}
Payment Method: ${order.transactionId ? (order.transactionId.startsWith('TXN-CARD-') ? 'Credit/Debit Card' : order.transactionId.startsWith('TXN-CASH-') ? 'Cash on Delivery' : order.transactionId.startsWith('TXN-BHIM-') ? 'BHIM UPI Scanner' : 'Simulated Checkout') : 'Simulated Checkout'}
Merchant UPI:   ${order.transactionId && order.transactionId.startsWith('TXN-BHIM-') ? 'pokhriyalpratyush7@okicici (Pratyush Pokhriyal)' : 'N/A'}

------------------------------------------------------------
ITEMS PURCHASED:
------------------------------------------------------------
${itemsText}
------------------------------------------------------------
FINANCIAL SUMMARY:
------------------------------------------------------------
Subtotal:          INR ${subtotal.toFixed(2)}
Shipping Fee:      INR ${shipping.toFixed(2)}
GST/Tax (8%):      INR ${tax.toFixed(2)}
------------------------------------------------------------
GRAND TOTAL:       INR ${grandTotal.toFixed(2)}
============================================================
ECOLOGICAL IMPACT CONTRIBUTED:
------------------------------------------------------------
- Flower Waste Recycled: ${totalFlowers.toFixed(1)} kg
- Fresh Water Saved:      ${Math.round(totalWater).toLocaleString()} Liters
============================================================
Thank you for supporting circular & sustainable fashion!
Made with organic waste flower pigments. Recycled in India.
============================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vikasita_Receipt_${order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const finalizePayment = (e) => {
    e.preventDefault();
    setIsPaymentProcessing(true);

    // Generate transaction ID based on selected payment method
    let txnId = '';
    if (selectedPaymentMethod === 'card') {
      txnId = `TXN-CARD-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (selectedPaymentMethod === 'cash') {
      txnId = `TXN-CASH-${Math.floor(100000 + Math.random() * 900000)}`;
    } else {
      txnId = `TXN-BHIM-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    }
    setTempTxnId(txnId);

    // Show simulated device confirmation dialog after 1.5 seconds
    setTimeout(() => {
      setPaymentDeciding(true);
    }, 1500);
  };

  const handlePaymentApproved = async () => {
    setPaymentDeciding(false);
    
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: cart, transactionId: tempTxnId })
      });
      const data = await res.json();
      
      setIsPaymentProcessing(false);
      setShowPaymentGateway(false);
      setPaymentFields({ cardNumber: '', cardExpiry: '', cardCvv: '', cardName: '', upiId: '' });

      if (res.ok) {
        setCart([]);
        showToast(data.message, 'B2C');
        setActiveView('dashboard');
        setDashboardTab('orders');
        fetchOrders();
        downloadReceipt(data.order);
      } else {
        if (res.status === 401 || res.status === 403) {
          setCurrentUser(null);
          setToken(null);
          localStorage.removeItem('vikasita_user');
          localStorage.removeItem('vikasita_token');
          setShopMode('B2C');
          setActiveView('home');
          showToast('Session expired. Please sign in again.');
        } else {
          showToast(data.error || 'Failed to place order.', 'B2C');
        }
      }
    } catch (err) {
      // Local fallback checkout
      console.warn('Backend order checkout offline. Simulating local ledger database entry.', err);
      const localOrders = JSON.parse(localStorage.getItem('vikasita_orders')) || [];
      const totals = calculateTotals();
      
      const newOrder = {
        id: `BT-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString(),
        clientType: currentUser.role,
        totalAmount: totals.total,
        status: 'processing',
        items: [...cart],
        transactionId: tempTxnId
      };

      localOrders.push(newOrder);
      localStorage.setItem('vikasita_orders', JSON.stringify(localOrders));
      setOrders(localOrders);

      setCart([]);
      setIsPaymentProcessing(false);
      setShowPaymentGateway(false);
      setPaymentFields({ cardNumber: '', cardExpiry: '', cardCvv: '', cardName: '', upiId: '' });

      showToast(`Payment Approved! Order ${newOrder.id} placed successfully!`, 'B2C');
      setActiveView('dashboard');
      setDashboardTab('orders');
      downloadReceipt(newOrder);
    }
  };

  const handlePaymentCancelled = () => {
    setPaymentDeciding(false);
    setIsPaymentProcessing(false);
    setShowPaymentGateway(false);
    showToast('Payment Not Approved! Transaction declined.', 'B2C');
  };

  const handlePaymentDenied = (e) => {
    e.preventDefault();
    setIsPaymentProcessing(true);
    setTimeout(() => {
      setIsPaymentProcessing(false);
      setShowPaymentGateway(false);
      showToast('Payment Not Approved! Transaction declined.', 'B2C');
    }, 1500);
  };

  const handleCheckStatus = async (order) => {
    setStatusCheckOrder(order);
    setStatusCheckLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const latestOrders = await res.json();
        setOrders(latestOrders);
        
        const updatedOrder = latestOrders.find(o => o.id === order.id);
        if (updatedOrder && updatedOrder.status !== 'processing') {
          setTimeout(() => {
            setStatusCheckLoading(false);
            showToast(`Order status updated to: ${updatedOrder.status}`, 'B2C');
            setStatusCheckOrder(null);
          }, 1800);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch latest status from backend:', err);
    }

    setTimeout(() => {
      setStatusCheckLoading(false);
    }, 1800);
  };

  const updateOrderStatusApproved = async () => {
    if (!statusCheckOrder) return;
    const orderId = statusCheckOrder.id;
    
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Payment confirmed! Order status updated to approved.', 'B2C');
        setStatusCheckOrder(null);
        fetchOrders();
      } else {
        showToast(data.error || 'Failed to update order status.', 'B2C');
      }
    } catch (err) {
      console.warn('Backend order update offline. Updating local orders.', err);
      const localOrders = JSON.parse(localStorage.getItem('vikasita_orders')) || [];
      const idx = localOrders.findIndex(o => o.id === orderId);
      if (idx > -1) {
        localOrders[idx].status = 'completed';
        localStorage.setItem('vikasita_orders', JSON.stringify(localOrders));
        setOrders(localOrders);
      }
      showToast('Payment confirmed! Order status updated to approved.', 'B2C');
      setStatusCheckOrder(null);
    }
  };

  const updateOrderStatusCancelled = async () => {
    if (!statusCheckOrder) return;
    const orderId = statusCheckOrder.id;

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'declined' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Payment not found! Order status updated to declined.', 'B2C');
        setStatusCheckOrder(null);
        fetchOrders();
      } else {
        showToast(data.error || 'Failed to update order status.', 'B2C');
      }
    } catch (err) {
      console.warn('Backend order update offline. Updating local orders.', err);
      const localOrders = JSON.parse(localStorage.getItem('vikasita_orders')) || [];
      const idx = localOrders.findIndex(o => o.id === orderId);
      if (idx > -1) {
        localOrders[idx].status = 'declined';
        localStorage.setItem('vikasita_orders', JSON.stringify(localOrders));
        setOrders(localOrders);
      }
      showToast('Payment not found! Order status updated to declined.', 'B2C');
      setStatusCheckOrder(null);
    }
  };



  const getCustomForecast = () => {
    const weightFactor = customFlower === 'mixed' ? 1.4 : 0.9;
    const flowersKg = (customDensity * weightFactor * 0.03).toFixed(1);
    const waterSaved = Math.round(customDensity * 8.5);
    return { flowersKg, waterSaved };
  };

  const addCustomizedToCart = () => {
    const isB2B = shopMode === 'B2B';
    const quantity = isB2B ? 50 : 1;
    const price = isB2B ? 4999.00 : 12499.00;
    
    const cartKey = `custom_${customFabric}_${customFlower}_${shopMode}`;
    const forecast = getCustomForecast();

    setCart(prev => {
      const idx = prev.findIndex(item => item.cartKey === cartKey);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      } else {
        return [...prev, {
          cartKey,
          productId: 'custom_dress',
          title: `Custom ${fabricDisplayNames[customFabric] || (customFabric.charAt(0).toUpperCase() + customFabric.slice(1))} Dress (${flowerDisplayNames[customFlower] || (customFlower.charAt(0).toUpperCase() + customFlower.slice(1))} dye)`,
          price,
          quantity,
          image: dressImg,
          mode: shopMode,
          isCustom: true,
          fabric: customFabric,
          flower: customFlower,
          moq: isB2B ? 50 : 1,
          ecoWater: forecast.waterSaved,
          ecoFlowers: parseFloat(forecast.flowersKg)
        }];
      }
    });

    showToast(`Added custom eco-printed dress to Cart`, isB2B ? 'B2B' : 'B2C');
  };

  // --- WHOLESALE TIERS CALCULATOR ---
  const getBulkCalculatorMetrics = () => {
    const baseRetailUnitPrice = 6999.00;
    let discount = 50;
    if (calcQty > 1000) discount = 68;
    else if (calcQty > 500) discount = 65;
    else if (calcQty > 200) discount = 60;
    else if (calcQty > 100) discount = 55;

    const unitCost = baseRetailUnitPrice * (1 - discount / 100);
    const costWholesale = unitCost * calcQty;
    const costRetail = baseRetailUnitPrice * calcQty;
    const saved = costRetail - costWholesale;

    const water = calcQty * 320;
    const flowers = Math.round(calcQty * 1.2);

    return { unitCost, discount, saved, water, flowers };
  };

  const calcMetrics = getBulkCalculatorMetrics();
  const cartTotals = calculateTotals();

  return (
    <div>
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type === 'B2B' ? 'b2b' : ''}`}>
            {toast.type === 'B2B' 
              ? <i className="fa-solid fa-briefcase text-warning"></i> 
              : <i className="fa-solid fa-seedling text-success"></i>
            }
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Floating Botanical Decors */}
      <div className="decor-petal" style={{ top: '15%', left: '5%', fontSize: '1.5rem' }}><i className="fa-solid fa-leaf text-success"></i></div>
      <div className="decor-petal" style={{ top: '45%', right: '8%', fontSize: '2rem', animationDelay: '2s' }}><i className="fa-solid fa-seedling text-warning"></i></div>
      <div className="decor-petal" style={{ bottom: '25%', left: '10%', fontSize: '1.2rem', animationDelay: '4s' }}><i className="fa-solid fa-spa text-danger"></i></div>

      {/* Header Navigation */}
      <header>
        <div className="container nav-container">
          <a href="#" className="logo-link" onClick={() => setActiveView('home')}>
            <img src={logoImg} alt="Vikasita Logo" className="logo-img" />
          </a>
          
          <nav>
            <ul>
              <li className={`nav-item ${activeView === 'home' ? 'active' : ''}`}><a href="#" onClick={() => setActiveView('home')}>Home</a></li>
              <li className={`nav-item ${activeView === 'shop' ? 'active' : ''}`}><a href="#" onClick={() => setActiveView('shop')}>Shop Products</a></li>
              <li className={`nav-item ${activeView === 'about' ? 'active' : ''}`}><a href="#" onClick={() => setActiveView('about')}>Our Process</a></li>
            </ul>
          </nav>
          
          <div className="nav-controls">
            {/* Search Input and Button */}
            <div className="search-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'shop' && activeView !== 'cart') {
                    setActiveView('shop');
                  }
                }}
                style={{
                  width: showSearch ? '200px' : '0px',
                  opacity: showSearch ? 1 : 0,
                  padding: showSearch ? '8px 12px 8px 36px' : '0px',
                  border: showSearch ? '1px solid var(--border-color)' : 'none',
                  borderRadius: 'var(--border-radius-md)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  color: 'var(--text-dark)',
                  marginRight: '8px'
                }}
              />
              <button 
                className="badge-btn" 
                onClick={() => {
                  setShowSearch(!showSearch);
                }} 
                style={{
                  position: showSearch ? 'absolute' : 'static',
                  left: showSearch ? '4px' : 'auto',
                  border: showSearch ? 'none' : '1px solid var(--border-color)',
                  background: showSearch ? 'transparent' : '#fff',
                  zIndex: 2,
                  width: showSearch ? '32px' : '44px',
                  height: showSearch ? '32px' : '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Toggle Search"
              >
                <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}></i>
              </button>
              {showSearch && searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '18px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    fontSize: '0.85rem',
                    zIndex: 3
                  }}
                  aria-label="Clear Search Query"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <button className="badge-btn" onClick={() => setActiveView('cart')} aria-label="Open Shopping Cart">
              <i className="fa-solid fa-bag-shopping"></i>
              {cart.length > 0 && <span className="badge-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
            </button>
            
            <div id="auth-nav-container">
              {currentUser ? (
                <div className="profile-widget" onClick={() => setActiveView('dashboard')}>
                  <div className="profile-avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
                  <span className="profile-name">{currentUser.name}</span>
                  <span className={`profile-role-tag ${currentUser.role === 'B2B' ? 'b2b' : ''}`}>{currentUser.role}</span>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={() => { setAuthRole('B2C'); setShowAuthModal(true); }}>
                  <i className="fa-solid fa-user"></i> Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* VIEW: HOME */}
        {activeView === 'home' && (
          <section className="view-section active">
            <div className="hero">
              <div className="container hero-grid">
                <div className="hero-content">
                  <div className="hero-badge">
                    <i className="fa-solid fa-clover"></i> 100% Organic & Flower Repurposed
                  </div>
                  <h1>Fashion Dyed by <span>Natural Waste</span> Flowers</h1>
                  <p className="hero-description">
                    Vikasita rescues floral waste from temples and weddings, converting them into rich organic pigments. Every piece is an eco-printed masterpiece with zero toxic chemicals.
                  </p>
                  <div className="hero-actions">
                    <button className="btn btn-primary" onClick={() => setActiveView('shop')}>
                      <i className="fa-solid fa-shop"></i> Shop B2C Retail
                    </button>
                    <button className="btn btn-accent" onClick={() => { setAuthRole('B2B'); setShowAuthModal(true); }}>
                      <i className="fa-solid fa-briefcase"></i> Partner B2B Wholesale
                    </button>
                  </div>
                </div>
                <div className="hero-image-wrapper">
                  <div className="hero-image-bg"></div>
                  <img src={marigoldsHeroImg} alt="Vibrant temple waste marigolds" className="hero-img" />
                </div>
              </div>
            </div>

            {/* Jaimala Memory Section */}
            <div className="jaimala-promo-section">
              <div className="container jaimala-grid">
                <div className="jaimala-image-wrapper">
                  <img src={jaimalaImg} alt="Wedding Jaimala Eco-Printing" className="jaimala-img" />
                </div>
                <div className="jaimala-content">
                  <div className="hero-badge" style={{ backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-dark)' }}>
                    <i className="fa-solid fa-heart"></i> Wedding Garland Preservation
                  </div>
                  <h2>We convert the wedding jaimala in the memorable memory.</h2>
                  <p>
                    Preserve the sacred blossoms from your special day. Send us your ceremonial wedding garlands (jaimalas), and our skilled craftspeople will eco-print them onto fine silks and linens, creating beautiful keepsake garments you will treasure forever.
                  </p>
                  <div className="hero-actions">
                    <button className="btn btn-primary" style={{ background: 'var(--secondary-dark)', boxShadow: '0 4px 14px rgba(184, 98, 98, 0.2)' }} onClick={() => setActiveView('about')}>
                      <i className="fa-solid fa-circle-info"></i> How It Works
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="features-section">
              <div className="container">
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon"><i className="fa-solid fa-recycle"></i></div>
                    <h3>Repurposed Petals</h3>
                    <p>We collect tons of discarded marigolds, roses, and hibiscus from holy shrines, stopping them from clogging waterways, and recycling them into luxury fashion dyes.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon"><i className="fa-solid fa-leaf"></i></div>
                    <h3>Steam Eco-Printing</h3>
                    <p>Each leaf and petal is rolled into the fabric and steamed, sealing the organic botanical print directly into the fibers. No two garments are identical.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon"><i className="fa-solid fa-earth-americas"></i></div>
                    <h3>Dual Distribution</h3>
                    <p>Wholesale capabilities for eco-boutiques looking for circular B2B supplies, alongside customized direct retail options for conscious B2C shoppers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="fabrics-section">
              <div className="container">
                <div className="section-header">
                  <h2>Our Conscious Base Fabrics</h2>
                  <p>We source only 100% natural, biodegradable textiles engineered to absorb and lock botanical pigments, featuring our new signature organic silk.</p>
                </div>
                <div className="fabrics-grid">
                  <div className="fabric-card featured-fabric">
                    <div className="fabric-img-wrapper">
                      <img src={organzaFabricImg} alt="Organza Silk Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--accent-color)' }}>Featured - Organza Silk</span>
                      <h3>Organza Silk</h3>
                      <p>A translucent, lightweight woven silk offering an ethereal drape and a subtle, sophisticated sheen that beautifully overlays botanical eco-prints.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={chanderiFabricImg} alt="Chanderi Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--primary-color)' }}>Heritage - Handloom</span>
                      <h3>Luxurious Chanderi</h3>
                      <p>A traditional Indian fabric woven with a blend of fine silk and organic cotton. Known for its lightweight feel, glossy texture, and rich gold-yellow pigments.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={cottonLinenFabricImg} alt="Cotton Linen Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--secondary-color)' }}>Blend - Daily Comfort</span>
                      <h3>Cotton Linen</h3>
                      <p>An exquisite, breathable blend of organic cotton and sustainable linen fibers. Offers a clean, soft off-white canvas with enhanced absorption for natural pigments.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={kotaSilkFabricImg} alt="Kota Silk Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}>Traditional - Fine Weave</span>
                      <h3>Exquisite Kota Silk</h3>
                      <p>Also known as Kota Doria, this light, sheer fabric is woven with a characteristic square-checkered pattern, capturing delicate leaf prints with distinct clarity.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={gauzeCottonFabricImg} alt="Gauze Cotton Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--secondary-color)', color: '#fff' }}>Lightweight - Open Weave</span>
                      <h3>Organic Gauze Cotton</h3>
                      <p>A double-layered gauze fabric made of soft organic cotton. It features a loosely woven, crinkled texture that absorbs pigments for a dreamy watercolor print.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={mulberrySilkFabricImg} alt="Mulberry Silk Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}>Luxury - High Sheen</span>
                      <h3>Organic Mulberry Silk</h3>
                      <p>The finest, smoothest mulberry silk harvested from organic silkworms. Known for its luxurious hand-feel, natural lilac-lavender tint, and absolute pigment brilliance.</p>
                    </div>
                  </div>
                  <div className="fabric-card">
                    <div className="fabric-img-wrapper" style={{ minHeight: '180px', height: '180px' }}>
                      <img src={cottonSatinFabricImg} alt="Cotton Satin Fabric" className="fabric-img" />
                    </div>
                    <div className="fabric-info">
                      <span className="fabric-badge" style={{ backgroundColor: 'var(--primary-color)', color: '#fff' }}>Satin Weave - Glossy</span>
                      <h3>Organic Cotton-Satin</h3>
                      <p>A luxurious organic cotton fabric woven in a smooth satin construction. It features a subtle lustrous sheen and a rich coral-salmon base that enhances natural plant dyes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VIEW: SHOP */}
        {activeView === 'shop' && (
          <section className="view-section active">
            <div className="container">
              <div className="section-header">
                <h2>Our Collection</h2>
                <p>Hand-crafted organic fabrics embedded with natural blossom stamps. Select your checkout experience.</p>
              </div>
              
              <div className="shop-controls">
                <div className="shop-mode-selector">
                  <button className={`shop-mode-btn ${shopMode === 'B2C' ? 'active' : ''}`} onClick={() => setShopMode('B2C')}>
                    <i className="fa-solid fa-user"></i> B2C Retail
                  </button>
                  <button className={`shop-mode-btn ${shopMode === 'B2B' ? 'active' : ''}`} onClick={() => setShopMode('B2B')}>
                    <i className="fa-solid fa-briefcase"></i> B2B Wholesale
                  </button>
                </div>
                
                <div className="shop-filter-bar">
                  {['all', 'marigold', 'rose', 'eucalyptus'].map(cat => (
                    <button key={cat} className={`filter-btn ${categoryFilter === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)} Prints
                    </button>
                  ))}
                </div>
              </div>

              {shopMode === 'B2B' && (
                <div className="eco-impact-display" style={{ marginBottom: '32px' }}>
                  <div className="eco-impact-title" style={{ color: 'var(--accent-color)' }}>
                    <i className="fa-solid fa-circle-info"></i> B2B wholesale pricing active
                  </div>
                  <p className="eco-impact-text" style={{ color: 'var(--primary-dark)' }}>
                    Wholesale orders have a Minimum Order Quantity (MOQ) of 50 units per item. Prices reflect volume discount of ~60% off B2C retail rates. Tax ID verification is required at checkout.
                  </p>
                </div>
              )}

              <div className="products-grid">
                {products
                  .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
                  .filter(p => 
                    !searchQuery || 
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(p => {
                    const price = shopMode === 'B2B' ? p.b2bPrice : p.b2cPrice;
                    return (
                      <div key={p.id} className="product-card">
                        <div className="product-image-container">
                          <img src={p.image} alt={p.title} className="product-img" style={{
                            filter: p.id === 'prod_rose_shirt' 
                              ? 'sepia(0.2) hue-rotate(-10deg) saturate(1.1)'
                              : p.id === 'prod_eucalyptus_scarf'
                              ? 'grayscale(0.15) hue-rotate(50deg) saturate(0.8)'
                              : ''
                          }} />
                          <span className={`product-badge ${shopMode === 'B2B' ? 'b2b-badge' : ''}`}>
                            {shopMode === 'B2B' ? 'Wholesale Partner' : 'Hand-Printed'}
                          </span>
                        </div>
                        <div className="product-info">
                          <div className="product-flower-source">
                            <i className="fa-solid fa-leaf"></i> {p.category} dye base
                          </div>
                          <h3 className="product-title">{p.title}</h3>
                          <p className="product-description">{p.description}</p>
                          <div className="product-pricing">
                            <div className="price-box">
                              <span className="price-label">{shopMode === 'B2B' ? 'Wholesale Unit Rate' : 'Retail Rate'}</span>
                              <span className="price-value">₹{price.toFixed(2)}{shopMode === 'B2B' ? '/unit' : ''}</span>
                            </div>
                            {shopMode === 'B2B' && <div className="price-moq">Min: {p.moq} units</div>}
                          </div>
                          <button className={`btn ${shopMode === 'B2B' ? 'btn-accent' : 'btn-primary'}`} style={{ width: '100%', justifyContent: 'center' }} onClick={() => addToCart(p.id)}>
                            {shopMode === 'B2B' ? `Order Bulk (Min ${p.moq})` : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {products
                  .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
                  .filter(p => 
                    !searchQuery || 
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', width: '100%', gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '3rem', color: 'var(--text-light)', marginBottom: '16px' }}>
                        <i className="fa-solid fa-magnifying-glass-minus"></i>
                      </div>
                      <h3>No products found</h3>
                      <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>We couldn't find any products matching "{searchQuery}". Try a different search term or print category.</p>
                      <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>Clear Search</button>
                    </div>
                  )
                }
              </div>
            </div>
          </section>
        )}

        {/* VIEW: OUR PROCESS */}
        {activeView === 'about' && (
          <section className="view-section active">
            <div className="container" style={{ maxWidth: '960px' }}>
              <div className="section-header">
                <h2>The Journey of a Discarded Flower</h2>
                <p>How we turn sacred temple offerings into premium sustainable textiles.</p>
              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', marginTop: '24px' }}>
                {/* Step 1: Fabric Prep */}
                <div className="cart-item" style={{ gridTemplateColumns: '180px 1fr', borderLeft: '4px solid var(--primary-color)', alignItems: 'center' }}>
                  <div className="step-image-wrapper" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', height: '120px', width: '160px', border: '1px solid var(--border-color)', margin: 'auto' }}>
                    <img src={fabricPrepImg} alt="Fabric ready to mordant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>1. Fabric Preparation (Scouring & Mordanting)</h3>
                    <p style={{ color: 'var(--text-light)' }}>
                      Raw natural fabrics must be prepared to accept pigments. We perform <strong>scouring</strong> (washing in hot soda ash to remove natural oils and industrial starches) and <strong>mordanting</strong> (steeping in natural mineral mordants like alum). This opens up the textile fibers, ensuring the upcoming botanical prints bind securely and remain wash-fast.
                    </p>
                  </div>
                </div>

                {/* Step 2: Sourcing and Arranging the Flowers */}
                <div className="cart-item" style={{ gridTemplateColumns: '180px 1fr', borderLeft: '4px solid var(--accent-color)', alignItems: 'center' }}>
                  <div className="step-image-wrapper" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', height: '120px', width: '160px', border: '1px solid var(--border-color)', margin: 'auto' }}>
                    <img src={sourceArrangeImg} alt="Sourcing and arranging flowers" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>2. Sourcing & Arranging the Flowers</h3>
                    <p style={{ color: 'var(--text-light)' }}>
                      We partner with local collection groups to harvest fresh discarded flowers (like marigolds and roses) from temples and wedding halls. These petals and botanical elements are sorted, cleaned, and artfully arranged by hand directly onto the damp, mordanted fabric.
                    </p>
                  </div>
                </div>

                {/* Step 3: Rolling and Binding the Bundle */}
                <div className="cart-item" style={{ gridTemplateColumns: '180px 1fr', borderLeft: '4px solid var(--primary-color)', alignItems: 'center' }}>
                  <div className="step-image-wrapper" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', height: '120px', width: '160px', border: '1px solid var(--border-color)', margin: 'auto' }}>
                    <img src={rollingBindingImg} alt="Rolling and binding fabric bundle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>3. Rolling & Binding the Bundle</h3>
                    <p style={{ color: 'var(--text-light)' }}>
                      Once the flowers are arranged, the fabric is rolled up extremely tightly (typically around wooden dowels or copper pipes) and bound firmly with twine. This heavy physical compression is crucial to ensure that the botanical pigments remain in close, direct contact with the fibers.
                    </p>
                  </div>
                </div>

                {/* Step 4: Steaming the Bundle */}
                <div className="cart-item" style={{ gridTemplateColumns: '180px 1fr', borderLeft: '4px solid var(--secondary-color)', alignItems: 'center' }}>
                  <div className="step-image-wrapper" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', height: '120px', width: '160px', border: '1px solid var(--border-color)', margin: 'auto' }}>
                    <img src={steamingBundleImg} alt="Steaming the fabric bundle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>4. Steaming the Bundle</h3>
                    <p style={{ color: 'var(--text-light)' }}>
                      The bound bundles are placed into a custom steaming vessel or vat for several hours. The hot steam penetrates the tightly wrapped fabric layers, activating the natural pigments and permanently transferring the floral impressions directly into the fibers.
                    </p>
                  </div>
                </div>

                {/* Step 5: Unveiling & Rinsing */}
                <div className="cart-item" style={{ gridTemplateColumns: '180px 1fr', borderLeft: '4px solid var(--primary-color)', alignItems: 'center' }}>
                  <div className="step-image-wrapper" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', height: '120px', width: '160px', border: '1px solid var(--border-color)', margin: 'auto' }}>
                    <img src={unveilingRinsingImg} alt="Unveiling and rinsing eco-printed fabric" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>5. Unveiling & Rinsing</h3>
                    <p style={{ color: 'var(--text-light)' }}>
                      After cooling, the bundle is carefully unrolled to unveil the unique, organic botanical prints. The fabric is thoroughly rinsed in clean water to clear any loose organic debris, soaked in natural mineral baths to fix the colors, dried in the shade, and finally pressed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VIEW: CART */}
        {activeView === 'cart' && (
          <section className="view-section active">
            <div className="container">
              <div className="section-header">
                <h2>Your Cart</h2>
                <p>Review items, adjust quantities, and calculate your eco impact savings.</p>
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '4rem', color: 'var(--text-light)', marginBottom: '20px' }}>
                    <i className="fa-solid fa-basket-shopping"></i>
                  </div>
                  <h3>Your cart is empty</h3>
                  <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>Add eco-printed apparel to start making a difference.</p>
                  <button className="btn btn-primary" onClick={() => setActiveView('shop')}>Explore Shop</button>
                </div>
              ) : (
                <div className="cart-grid">
                  <div className="cart-items-list">
                    {cart
                      .map((item, originalIdx) => ({ ...item, originalIdx }))
                      .filter(item => 
                        !searchQuery || 
                        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.isCustom && item.fabric.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.isCustom && item.flower.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((item) => {
                        const isB2B = item.mode === 'B2B';
                        const step = isB2B ? 10 : 1;
                        return (
                          <div key={item.cartKey} className="cart-item">
                            <img src={item.image} alt={item.title} className="cart-item-img" style={{
                              filter: item.productId === 'custom_dress' && item.flower === 'rose'
                                ? 'hue-rotate(-10deg) saturate(1.2)'
                                : item.productId === 'custom_dress' && item.flower === 'eucalyptus'
                                ? 'hue-rotate(60deg) saturate(0.8)'
                                : ''
                            }} />
                            <div className="cart-item-info">
                              <h4>{item.title}</h4>
                              <div className="cart-item-meta">
                                Mode: <strong style={{ color: isB2B ? 'var(--accent-color)' : 'var(--primary-color)' }}>{item.mode}</strong>
                                {item.isCustom && ` | Fabric: ${fabricDisplayNames[item.fabric] || item.fabric} | Inlay: ${flowerDisplayNames[item.flower] || item.flower}`}
                              </div>
                              <div className="quantity-controls">
                                <span className="form-label" style={{ marginBottom: 0 }}>Qty:</span>
                                <button className="qty-btn" onClick={() => updateCartQty(item.originalIdx, -step)}>-</button>
                                <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                <button className="qty-btn" onClick={() => updateCartQty(item.originalIdx, step)}>+</button>
                                {isB2B && <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>(MOQ {item.moq})</span>}
                              </div>
                            </div>
                            <div className="cart-item-price-col">
                              <div className="cart-item-price">₹{(item.price * item.quantity).toFixed(2)}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '8px' }}>₹{item.price.toFixed(2)}{isB2B ? '/unit' : ''}</div>
                              <button className="remove-item-btn" onClick={() => removeCartItem(item.originalIdx)}>Remove</button>
                            </div>
                          </div>
                        );
                      })}
                    {cart
                      .filter(item => 
                        !searchQuery || 
                        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.isCustom && item.fabric.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.isCustom && item.flower.toLowerCase().includes(searchQuery.toLowerCase()))
                      ).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-light)' }}>
                          No cart items match your search.
                        </div>
                      )
                    }
                  </div>

                  <div className="cart-summary">
                    <h3 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Order Summary</h3>
                    
                    <div className="cart-impact-meter">
                      <h4><i className="fa-solid fa-leaf"></i> Eco Savings Dashboard</h4>
                      <div className="impact-stats">
                        <div className="impact-stat-item">
                          <div className="impact-stat-num rose">{cartTotals.ecoFlowers.toFixed(1)}</div>
                          <div className="impact-stat-lbl">Kg Flowers Recycled</div>
                        </div>
                        <div className="impact-stat-item">
                          <div className="impact-stat-num marigold">{Math.round(cartTotals.ecoWater).toLocaleString()}</div>
                          <div className="impact-stat-lbl">Liters Water Saved</div>
                        </div>
                      </div>
                    </div>

                    <div className="summary-row">
                      <span>Items Total</span>
                      <span>₹{cartTotals.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="summary-row">
                      <span>Estimated Shipping</span>
                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>FREE</span>
                    </div>
                    <div className="summary-row">
                      <span>Tax (8%)</span>
                      <span>₹{cartTotals.tax.toFixed(2)}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Grand Total</span>
                      <span>₹{cartTotals.total.toFixed(2)}</span>
                    </div>

                    {cart.some(i => i.mode === 'B2B') && currentUser && currentUser.role === 'B2B' && (
                      <div className="eco-impact-display" style={{ marginTop: '20px', borderColor: 'var(--accent-color)' }}>
                        <p className="eco-impact-text" style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>
                          <i className="fa-solid fa-id-card"></i> <strong>B2B Billing active</strong>: Invoicing corporate account: <strong>{currentUser.company}</strong> ({currentUser.taxid}).
                        </p>
                      </div>
                    )}

                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '12px', fontSize: '1.05rem' }} onClick={processCheckout}>
                      <i className="fa-solid fa-check-double"></i> Proceed to Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* VIEW: DASHBOARD */}
        {activeView === 'dashboard' && currentUser && (
          <section className="view-section active">
            <div className="container">
              <div className="section-header">
                <h2>{currentUser.role === 'B2B' ? 'Business Partner Portal' : 'Customer Account Profile'}</h2>
                <p>{currentUser.role === 'B2B' ? 'Manage wholesale catalog orders, business invoicing, and volume savings.' : 'Review retail transactions, carbon savings offsets, and delivery tracking.'}</p>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-sidebar">
                  <div className={`dashboard-nav-item ${dashboardTab === 'orders' ? (currentUser.role === 'B2B' ? 'b2b-active' : 'active') : ''}`} onClick={() => setDashboardTab('orders')}>
                    <i className="fa-solid fa-list-check"></i> Orders History
                  </div>
                  {currentUser.role === 'B2B' && (
                    <div className={`dashboard-nav-item ${dashboardTab === 'b2b-calculator' ? 'b2b-active' : ''}`} onClick={() => setDashboardTab('b2b-calculator')}>
                      <i className="fa-solid fa-calculator"></i> Bulk Discount Model
                    </div>
                  )}
                  <div className={`dashboard-nav-item ${dashboardTab === 'profile' ? (currentUser.role === 'B2B' ? 'b2b-active' : 'active') : ''}`} onClick={() => setDashboardTab('profile')}>
                    <i className="fa-solid fa-sliders"></i> Account Settings
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
                  <div className="dashboard-nav-item" style={{ color: 'var(--secondary-dark)' }} onClick={handleLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i> Logout Account
                  </div>
                </div>

                <div className="dashboard-content">
                  {/* Dashboard Subtab: Orders */}
                  {dashboardTab === 'orders' && (
                    <div>
                      <h3 style={{ marginBottom: '20px' }}>Your Orders</h3>
                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Date</th>
                              <th>Client Type</th>
                              <th>Total Amount</th>
                              <th>Status</th>
                              <th>Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.filter(o => o.clientType === currentUser.role).length === 0 ? (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 0' }}>
                                  No orders found. Add items to cart to start.
                                </td>
                              </tr>
                            ) : (
                              orders
                                .filter(o => o.clientType === currentUser.role)
                                .slice().reverse()
                                .map(o => (
                                  <tr key={o.id}>
                                    <td style={{ fontFamily: 'var(--font-title)', fontWeight: 700 }}>{o.id}</td>
                                    <td>{o.date}</td>
                                    <td><span className="status-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>{o.clientType === 'B2B' ? 'Wholesale Partner' : 'Retail B2C'}</span></td>
                                    <td style={{ fontWeight: 600 }}>₹{o.totalAmount.toFixed(2)}</td>
                                    <td>
                                      <span className={`status-badge ${o.status === 'processing' ? 'processing' : o.status === 'declined' ? 'declined' : 'completed'}`}>
                                        {o.status}
                                      </span>
                                      {o.status === 'processing' && (
                                        <button 
                                          className="btn btn-outline" 
                                          style={{ padding: '2px 6px', fontSize: '0.65rem', marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle', height: 'auto', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', cursor: 'pointer', background: 'transparent', borderRadius: '4px' }}
                                          onClick={() => handleCheckStatus(o)}
                                        >
                                          <i className="fa-solid fa-arrows-rotate"></i> Check Status
                                        </button>
                                      )}
                                    </td>
                                    <td>
                                      <a href="#" style={{ color: 'var(--primary-color)', fontWeight: 600 }} onClick={(e) => { 
                                        e.preventDefault(); 
                                        showToast(`Downloading invoice for ${o.id}...`); 
                                        downloadReceipt(o);
                                      }}>
                                        <i className="fa-solid fa-file-pdf"></i> PDF Invoice
                                      </a>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Dashboard Subtab: B2B Calculator */}
                  {dashboardTab === 'b2b-calculator' && currentUser.role === 'B2B' && (
                    <div>
                      <h3 style={{ marginBottom: '12px' }}>Wholesale Quantity Discounts</h3>
                      <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>Configure target purchases to simulate business volume pricing models.</p>
                      <div className="form-group">
                        <label className="form-label">Projected Bulk Quantity (units)</label>
                        <input type="number" className="form-control" value={calcQty} onChange={(e) => setCalcQty(Math.max(50, parseInt(e.target.value) || 50))} min="50" step="50" />
                      </div>

                      <div className="metric-grid" style={{ marginTop: '24px' }}>
                        <div className="metric-card">
                          <div className="metric-title">Unit Cost</div>
                          <div className="metric-value">₹{calcMetrics.unitCost.toFixed(2)}</div>
                        </div>
                        <div className="metric-card accent">
                          <div className="metric-title">Volume Discount</div>
                          <div className="metric-value">{calcMetrics.discount}% Off</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-title">Projected Saving</div>
                          <div className="metric-value">₹{Math.round(calcMetrics.saved).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="eco-impact-display" style={{ borderColor: 'var(--accent-color)' }}>
                        <div className="eco-impact-title" style={{ color: 'var(--accent-color)' }}>
                          <i className="fa-solid fa-leaf"></i> Estimated Ecological Contribution
                        </div>
                        <p className="eco-impact-text" style={{ color: 'var(--text-dark)' }}>
                          Repurposing <strong>{calcMetrics.flowers.toLocaleString()} kg</strong> of sacred temple flower waste and saving <strong>{calcMetrics.water.toLocaleString()} liters</strong> of fresh water compared to conventional chemical dyeing systems.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dashboard Subtab: Settings */}
                  {dashboardTab === 'profile' && (
                    <div>
                      <h3 style={{ marginBottom: '20px' }}>Account Settings</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Full Name / Representative</label>
                          <input type="text" className="form-control" value={currentUser.name} readOnly />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email ID</label>
                          <input type="email" className="form-control" value={currentUser.email} readOnly />
                        </div>
                      </div>
                      {currentUser.role === 'B2B' && (
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Business Name</label>
                            <input type="text" className="form-control" value={currentUser.company || ''} readOnly />
                          </div>
                          <div className="form-group">
                            <label className="form-label">GSTIN / Tax ID Number</label>
                            <input type="text" className="form-control" value={currentUser.taxid || ''} readOnly />
                          </div>
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">Account Verification Status</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-circle-check"></i> Active & Verified
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Sign In</h3>
              <button className="modal-close" onClick={() => setShowAuthModal(false)}>&times;</button>
            </div>
            
            <div className="auth-panel-toggle">
              <button className={`auth-panel-btn b2c ${authRole === 'B2C' ? 'active' : ''}`} onClick={() => setAuthRole('B2C')}>
                <i className="fa-solid fa-user"></i> Customer Panel
              </button>
              <button className={`auth-panel-btn b2b ${authRole === 'B2B' ? 'active' : ''}`} onClick={() => setAuthRole('B2B')}>
                <i className="fa-solid fa-briefcase"></i> Businessman Panel
              </button>
            </div>

            {(authSubtab === 'login' || authSubtab === 'signup') && (
              <div className="modal-tabs">
                <div className={`modal-tab ${authSubtab === 'login' ? 'active' : ''}`} onClick={() => setAuthSubtab('login')}>Login</div>
                <div className={`modal-tab ${authSubtab === 'signup' ? 'active' : ''}`} onClick={() => setAuthSubtab('signup')}>Register Account</div>
              </div>
            )}
            
            {(authSubtab === 'forgot-password' || authSubtab === 'reset-password') && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-title)' }}>
                {authSubtab === 'forgot-password' ? 'Forgot Password Recovery' : 'Reset Account Password'}
              </div>
            )}

            <div className="modal-body">
              {(authSubtab === 'login' || authSubtab === 'signup') && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    type="button" 
                    className={`btn ${authMethod === 'email' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} 
                    onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
                  >
                    {authSubtab === 'login' ? 'Email Login' : 'Email Sign Up'}
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${authMethod === 'phone' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} 
                    onClick={() => { setAuthMethod('phone'); setOtpSent(false); }}
                  >
                    Phone OTP
                  </button>
                </div>
              )}

              {authMethod === 'phone' ? (
                <div>
                  {!otpSent ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          required 
                          placeholder="e.g. 9876543210" 
                          value={phoneField} 
                          onChange={(e) => setPhoneField(e.target.value)} 
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }} disabled={otpLoading}>
                        {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Enter 6-Digit OTP</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          required 
                          maxLength={6}
                          placeholder="123456" 
                          value={otpField} 
                          onChange={(e) => setOtpField(e.target.value)} 
                        />
                        <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-light)' }}>
                          OTP sent to {phoneField}.
                        </small>
                      </div>
                      
                      {/* Auto-Registration details for new phone accounts */}
                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '14px', paddingTop: '14px', marginBottom: '14px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                          New account details (only used if this phone is not registered yet):
                        </p>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label className="form-label">Full Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Jane Doe" 
                            value={authFields.name} 
                            onChange={(e) => setAuthFields(p => ({ ...p, name: e.target.value }))} 
                          />
                        </div>
                        {authRole === 'B2B' && (
                          <>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label className="form-label">Business Name</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Bloom Boutique Ltd" 
                                value={authFields.company} 
                                onChange={(e) => setAuthFields(p => ({ ...p, company: e.target.value }))} 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label className="form-label">GSTIN / Tax ID Number</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                placeholder="22AAAAA0000A1Z5" 
                                value={authFields.taxid} 
                                onChange={(e) => setAuthFields(p => ({ ...p, taxid: e.target.value }))} 
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <button type="submit" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }} disabled={otpVerifyLoading}>
                        {otpVerifyLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      
                      <div style={{ textAlign: 'center', marginTop: '14px' }}>
                        <span 
                          style={{ color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                          onClick={() => { setOtpField(''); setOtpSent(false); }}
                        >
                          Change Phone Number
                        </span>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                authSubtab === 'login' ? (
                  <form onSubmit={handleAuthSubmit}>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" required placeholder="name@domain.com" value={authFields.email} onChange={(e) => setAuthFields(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label">Password</label>
                      <input type="password" className="form-control" required placeholder="••••••••" value={authFields.password} onChange={(e) => setAuthFields(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                      <span 
                        style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setAuthSubtab('forgot-password')}
                      >
                        Forgot Password?
                      </span>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
                      Sign In
                    </button>
                  </form>
                ) : authSubtab === 'signup' ? (
                  <form onSubmit={handleAuthSubmit}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input type="text" className="form-control" required placeholder="Jane Doe" value={authFields.name} onChange={(e) => setAuthFields(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" required placeholder="jane@domain.com" value={authFields.email} onChange={(e) => setAuthFields(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number (Optional)</label>
                      <input type="tel" className="form-control" placeholder="e.g. 9876543210" value={authFields.phone} onChange={(e) => setAuthFields(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    
                    {authRole === 'B2B' && (
                      <div style={{ borderTop: '1.5px dashed var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Business Name</label>
                          <input type="text" className="form-control" required placeholder="Bloom Boutique Ltd" value={authFields.company} onChange={(e) => setAuthFields(p => ({ ...p, company: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">GSTIN / Tax ID Number</label>
                          <input type="text" className="form-control" required placeholder="22AAAAA0000A1Z5" value={authFields.taxid} onChange={(e) => setAuthFields(p => ({ ...p, taxid: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Verify Business License (PDF/Image)</label>
                          <input type="file" className="form-control" accept="image/*,application/pdf" style={{ padding: '6px 12px' }} />
                          <small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Upload license copy for instant verification.</small>
                        </div>
                      </div>
                    )}

                    <div className="form-group" style={{ marginTop: '20px' }}>
                      <label className="form-label">Create Password</label>
                      <input type="password" className="form-control" required placeholder="Minimum 6 characters" value={authFields.password} onChange={(e) => setAuthFields(p => ({ ...p, password: e.target.value }))} />
                    </div>

                    <button type="submit" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
                      {authRole === 'B2B' ? 'Create Businessman Account' : 'Create Customer Account'}
                    </button>
                  </form>
                ) : authSubtab === 'forgot-password' ? (
                  <form onSubmit={handleForgotPasswordSubmit}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Enter your registered email address below, and we will send a password reset verification link/code.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" required placeholder="name@domain.com" value={authFields.email} onChange={(e) => setAuthFields(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
                      Send Reset Verification
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <span 
                        style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setAuthSubtab('login')}
                      >
                        Back to Login
                      </span>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Enter the 6-digit verification code sent to your email along with your new password.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" required placeholder="name@domain.com" value={authFields.email} onChange={(e) => setAuthFields(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">6-Digit Verification Code</label>
                      <input type="text" className="form-control" required maxLength={6} placeholder="123456" value={otpField} onChange={(e) => setOtpField(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" className="form-control" required placeholder="Minimum 6 characters" value={authFields.password} onChange={(e) => setAuthFields(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <button type="submit" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
                      Reset Password & Login
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <span 
                        style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setAuthSubtab('forgot-password')}
                      >
                        Resend Code
                      </span>
                      <span style={{ margin: '0 8px', color: 'var(--text-light)' }}>|</span>
                      <span 
                        style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setAuthSubtab('login')}
                      >
                        Back to Login
                      </span>
                    </div>
                  </form>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATUS VERIFICATION MODAL */}
      {statusCheckOrder && (
        <div className="modal-overlay active" style={{ zIndex: 1200 }}>
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>UPI / Bank Status Check</h3>
              <button className="modal-close" onClick={() => setStatusCheckOrder(null)} disabled={statusCheckLoading}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px', position: 'relative', minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              {statusCheckLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '3.5rem', color: 'var(--primary-color)', marginBottom: '20px' }}></i>
                  <h4 style={{ margin: 0, color: 'var(--text-dark)' }}>Checking payment status...</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '6px' }}>
                    Verifying Transaction ID: {statusCheckOrder.transactionId}
                  </p>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '2px', fontWeight: 'bold' }}>
                    Merchant Account: pokhriyalpratyush7@okicici
                  </p>
                </>
              ) : (
                <div style={{ animation: 'slideUp 0.3s ease-out', width: '100%' }}>
                  <i className="fa-solid fa-building-columns" style={{ fontSize: '3.5rem', color: 'var(--accent-color)', marginBottom: '16px' }}></i>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: 'var(--text-dark)' }}>Merchant Receipt Verification</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                    Since this is a local simulation, we cannot access the real bank API. Please confirm if the payment of <strong>₹{statusCheckOrder.totalAmount.toFixed(2)}</strong> was actually received in your Google Pay account (<strong>Pratyush Pokhriyal</strong>):
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }} 
                      onClick={updateOrderStatusApproved}
                    >
                      <i className="fa-solid fa-check"></i> Yes, Payment Received
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', color: '#c94053', borderColor: '#c94053' }} 
                      onClick={updateOrderStatusCancelled}
                    >
                      <i className="fa-solid fa-xmark"></i> No, Not Received
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT GATEWAY MODAL */}
      {showPaymentGateway && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>Vikasita Secure Pay</h3>
              <button className="modal-close" onClick={() => { setShowPaymentGateway(false); setPaymentDeciding(false); }} disabled={isPaymentProcessing}>&times;</button>
            </div>
            
            <div style={{ padding: '24px 32px 12px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Amount to Pay</span>
                <h4 style={{ fontSize: '1.6rem', color: 'var(--primary-color)', margin: 0 }}>₹{cartTotals.total.toFixed(2)}</h4>
              </div>

              {!isPaymentProcessing && selectedPaymentMethod === 'qr' && (
                <div style={{ textAlign: 'center', background: '#fdf2f2', border: '1px solid #fde2e2', padding: '6px 12px', borderRadius: '20px', color: '#c94053', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-regular fa-clock"></i>
                  <span>0:{paymentTimer < 10 ? `0${paymentTimer}` : paymentTimer}</span>
                </div>
              )}

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Email</span>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser?.email}</div>
              </div>
            </div>

            <div className="modal-tabs">
              <div className={`modal-tab ${selectedPaymentMethod === 'cash' ? 'active' : ''}`} onClick={() => !isPaymentProcessing && setSelectedPaymentMethod('cash')}>
                <i className="fa-solid fa-money-bill-wave"></i> Cash
              </div>
              <div className={`modal-tab ${selectedPaymentMethod === 'card' ? 'active' : ''}`} onClick={() => !isPaymentProcessing && setSelectedPaymentMethod('card')}>
                <i className="fa-solid fa-credit-card"></i> Card
              </div>
              <div className={`modal-tab ${selectedPaymentMethod === 'qr' ? 'active' : ''}`} onClick={() => !isPaymentProcessing && setSelectedPaymentMethod('qr')}>
                <i className="fa-solid fa-qrcode"></i> Scanner
              </div>
            </div>

            <div className="modal-body" style={{ position: 'relative' }}>
              {isPaymentProcessing && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, animation: 'fadeIn 0.3s ease-out', padding: '24px', textAlign: 'center' }}>
                  {!paymentDeciding ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '16px' }} ></i>
                      <h4 style={{ margin: 0 }}>Processing Transaction...</h4>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '4px' }}>Connecting securely with Vikasita Vault</p>
                    </>
                  ) : (
                    <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                      <i className="fa-solid fa-shield-halved" style={{ fontSize: '3rem', color: 'var(--accent-color)', marginBottom: '16px' }}></i>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-dark)' }}>Confirm Payment Status</h4>
                      {selectedPaymentMethod === 'qr' ? (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.4' }}>
                          Verifying BHIM UPI Scanner transfer of <strong>₹{cartTotals.total.toFixed(2)}</strong>. Please confirm if the payment has been received in the Google Pay account of the UPI owner (<strong>Pratyush Pokhriyal / pokhriyalpratyush7@okicici</strong>):
                        </p>
                      ) : selectedPaymentMethod === 'cash' ? (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.4' }}>
                          Placing Cash on Delivery order of <strong>₹{cartTotals.total.toFixed(2)}</strong>. Please confirm to finalize this order entry in the local ledger:
                        </p>
                      ) : (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.4' }}>
                          Simulating secure bank checkout verification. Please confirm if the card transaction was completed successfully:
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }} 
                          onClick={handlePaymentApproved}
                        >
                          <i className="fa-solid fa-circle-check"></i> Yes, Approved & Paid
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', color: '#c94053', borderColor: '#c94053' }} 
                          onClick={handlePaymentCancelled}
                        >
                          <i className="fa-solid fa-circle-xmark"></i> No, Declined / Cancelled
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={finalizePayment}>
                {selectedPaymentMethod === 'card' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Cardholder Name</label>
                      <input type="text" className="form-control" required placeholder="Jane Doe" value={paymentFields.cardName} onChange={(e) => setPaymentFields(p => ({ ...p, cardName: e.target.value }))} disabled={isPaymentProcessing} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Card Number</label>
                      <input type="text" className="form-control" required placeholder="4111 2222 3333 4444" maxLength="19" value={paymentFields.cardNumber} onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setPaymentFields(p => ({ ...p, cardNumber: val }));
                      }} disabled={isPaymentProcessing} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input type="text" className="form-control" required placeholder="MM/YY" maxLength="5" value={paymentFields.cardExpiry} onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          setPaymentFields(p => ({ ...p, cardExpiry: val }));
                        }} disabled={isPaymentProcessing} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CVV</label>
                        <input type="password" className="form-control" required placeholder="•••" maxLength="3" value={paymentFields.cardCvv} onChange={(e) => setPaymentFields(p => ({ ...p, cardCvv: e.target.value.replace(/\D/g, '') }))} disabled={isPaymentProcessing} />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'cash' && (
                  <div style={{ padding: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <i className="fa-solid fa-money-bill-wave" style={{ fontSize: '2rem', color: 'var(--accent-color)' }}></i>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--text-dark)' }}>Cash on Delivery</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Pay when your package arrives</span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                      Please keep <strong>₹{cartTotals.total.toFixed(2)}</strong> in cash ready when the delivery agent arrives. We appreciate your support for sustainable fashion!
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'qr' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0', width: '100%' }}>
                    <div style={{ background: 'linear-gradient(135deg, #FF9933 0%, #138808 100%)', width: '100%', padding: '12px 20px', borderRadius: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BHIM UPI Merchant</span>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontFamily: 'var(--font-title)', fontWeight: 'bold' }}>Pratyush Pokhriyal</h4>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px', fontFamily: 'monospace' }}>UPI: pokhriyalpratyush7@okicici</div>
                      </div>
                      <div style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', color: '#111', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-qrcode" style={{ color: '#FF9933' }}></i> BHIM UPI
                      </div>
                    </div>
                    
                    <div style={{ border: '3.5px solid #FF9933', padding: '16px', borderRadius: '16px', background: '#fff', boxShadow: 'var(--shadow-md)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=pokhriyalpratyush7@okicici&pn=Pratyush%20Pokhriyal&am=${cartTotals.total.toFixed(2)}&cu=INR`)}`} 
                        alt="BHIM UPI Merchant QR Code for Pratyush Pokhriyal" 
                        style={{ display: 'block', width: '180px', height: '180px' }}
                      />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      <p style={{ fontWeight: '600' }}>Scan QR using any BHIM UPI App to Pay</p>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', alignItems: 'center' }}>
                        <i className="fa-solid fa-qrcode" style={{ fontSize: '1.4rem', color: '#138808' }}></i>
                        <span style={{ fontSize: '0.85rem', color: '#138808', fontWeight: 'bold' }}>Scan with Any BHIM UPI App</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'qr' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem' }} 
                      disabled={isPaymentProcessing}
                    >
                      I have Scanned and Paid
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem', color: '#c94053', borderColor: '#c94053' }} 
                      onClick={handlePaymentDenied}
                      disabled={isPaymentProcessing}
                    >
                      I have NOT Scanned / Paid
                    </button>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', marginTop: '20px', padding: '12px', fontSize: '1rem' }} 
                    disabled={isPaymentProcessing}
                  >
                    Pay ₹{cartTotals.total.toFixed(2)} Securely
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <div className="container footer-grid">
          <div className="footer-brand">
            <h3>Vika<span>sita</span></h3>
            <p>A zero-waste botanical dye project repurposing discarded temple and venue blooms into premium wearable garments.</p>
            <div className="footer-socials">
              <a href="#" className="social-icon" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
              <a href="#" className="social-icon" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
              <a href="#" className="social-icon" aria-label="Pinterest"><i className="fa-brands fa-pinterest-p"></i></a>
            </div>
          </div>
          
          <div className="footer-col">
            <h4>Shop Directory</h4>
            <ul>
              <li><a href="#" onClick={() => { setActiveView('shop'); setShopMode('B2C'); }}>B2C Retail Catalog</a></li>
              <li><a href="#" onClick={() => { setActiveView('shop'); setShopMode('B2B'); }}>B2B Wholesale Portal</a></li>
              <li><a href="#">New Arrivals</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Eco Transparency</h4>
            <ul>
              <li><a href="#" onClick={() => setActiveView('about')}>Eco-Print Process</a></li>
              <li><a href="#">LCA Carbon Audit</a></li>
              <li><a href="#">Shrine Clean Up Stats</a></li>
              <li><a href="#">Sourcing Map</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Online Operations</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '16px' }}>
              100% Online Working Model<br />
              Digital Sourcing & Eco-Distribution<br />
              Uttarakhand, India (No Physical Office)
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
              Email: vikasital222@gmail.com<br />
              Phone: +91 9410503427
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>&copy; 2026 Vikasita Eco Apparel. All Rights Reserved. Recycled in India.</p>
          <p>Made with organic waste flower pigments <i className="fa-solid fa-heart" style={{ color: 'var(--secondary-color)' }}></i></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
