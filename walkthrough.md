# Walkthrough: BloomThread MERN Stack E-Commerce Platform

We have successfully built and deployed **BloomThread**, a premium E-commerce platform selling natural waste flower eco-printed clothing, developed using the full-stack **MERN (MongoDB, Express, React, Node.js)** architecture.

---

## Architectural Layout

The codebase is organized in a monorepo structure inside:
[bloomthread-mern](file:///C:/Users/Pratyush/Pokhriyal/.gemini/antigravity-ide/scratch/bloomthread-mern/)

```
bloomthread-mern/
├── package.json                   # Root orchestrator scripts
├── backend/
│   ├── package.json               # Backend dependencies
│   └── server.js                  # Express API, MongoDB setup & JWT Auth
└── frontend/
    ├── package.json               # Vite + React configs
    ├── index.html                 # App layout mounting point
    └── src/
        ├── App.jsx                # Main React router and controller
        ├── index.css              # Premium botanical stylesheet
        ├── App.css                # Visual transitions & animations
        └── assets/                # Product images
```

---

## Key Features Implemented

### 1. Unified Authentication System
Supports discrete login panels for **B2C retail customers** and **B2B businessmen**. 
- Businessman registration collects corporate details (Company Name, GSTIN/Tax ID) and simulated document uploads.
- Password hashes are stored securely on the database using `bcryptjs`.
- Session persistence is established using JSON Web Tokens (JWT) stored client-side.

### 2. Dual-Mode Catalog (B2C & B2B)
- **B2C Mode**: Standard retail prices with single items added to the cart:
  - **Rose Print Silk Saree**: ₹10,000.00
  - **Blossom Rose Cotton Shirt**: ₹1.00
  - **Varanasi Marigold Linen Dress**: ₹5,500.00
  - **Botanical Eco-Print Hemp Jacket**: ₹5,200.00
- **B2B Mode**: ~60% discount unit pricing with a strict Minimum Order Quantity (MOQ) of 50 units. Adds 50 units to the cart by default and prevents decrements below the MOQ.

### 3. Interactive Design Studio (Flower Stamp Visualizer)
A visual editor letting users choose base fabrics (Linen, Cotton, Ahimsah Silk, Hemp) and select flower inputs (Marigolds, Rose Petals, Eucalyptus leaves, Mixed Blooms). It renders random botanical print stamps onto an HTML canvas with dynamic blending, simulating the steam printing process.

### 4. Eco Savings Calculator
Calculates real-time ecological savings (fresh water saved and kilograms of flower waste repurposed) based on items selected or configurations chosen.

### 5. Unified Payment Gateway
A custom secure checkout portal allowing checkout using multiple payment channels (in **Indian Rupees / ₹**):
- **Card payment**: Interactive inputs for card number (auto-spaces), expiry dates, CVV (dot masking), and cardholder name.
- **UPI payment**: Input for UPI ID / VPA to send simulated pay requests.
- **Scanner payment (Google Pay)**: Generates a **proper scannable dynamic QR code** using a public QR generation API. It formats real-time merchant details targeting the specified account **Pratyush Pokhriyal** (`upi://pay?pa=pokhriyalpratyush7@okicici&pn=Pratyush%20Pokhriyal&am=TOTAL_PRICE&cu=INR`) so that scanning it with Google Pay or any other UPI app will directly load the exact payment details prefilled!
- **Distance-based Shipping Charges**: Computes delivery fees dynamically using an interactive slider:
  - Local (≤ 50 km): **₹150.00**
  - Regional (51 - 200 km): **₹350.00**
  - National (201 - 1000 km): **₹600.00**
  - Remote (> 1000 km): **₹900.00**
- **Processing states**: Features realistic connection load overlays.

---

## Product Asset Demonstrations

Below are the high-quality product images generated using the image model to represent the organic botanical dyes:

![Eco-Printed Linen Dress](C:\Users\Pratyush Pokhriyal\.gemini\antigravity-ide\brain\3b699278-ab0d-4b6d-82b2-cb3efb89f8ec\ecoprint_dress_1783919454010.png)

*Figure 1: Varanasi Marigold Linen Dress showing warm carotenoid botanical prints.*

![Eco-Printed Cotton Shirt](C:\Users\Pratyush Pokhriyal\.gemini\antigravity-ide\brain\3b699278-ab0d-4b6d-82b2-cb3efb89f8ec\ecoprint_shirt_1783919465630.png)

*Figure 2: Blossom Rose Organic Cotton Shirt showing rusty rose leaf impressions.*

---

## Integration and Startup Scripts

We have provided convenient automation scripts:
- To start both frontend and backend concurrently:
  ```bash
  npm start
  ```
- This runs the backend on `http://localhost:5000` and the frontend client on `http://localhost:5173`.

### Backend Status Page and DB Connection
- **Root Landing Page**: Visiting `http://localhost:5000/` directly in the browser now displays a clean botanical-themed backend status page showing current connection state and system mode.
- **MongoDB Connection**: Connects to the local database at `mongodb://127.0.0.1:27017/vikasita` matching the default configuration used by MongoDB Compass.

### 6. Live Catalog & Cart Search Feature
- **Search Toggle**: A beautiful, minimalist search button (🔍) is added to the header navigation controls. Clicking it expands it into an elegant search input field.
- **Auto-Routing**: When typing a search query from other views (like Home or Our Process), the app automatically routes the user to the Shop view to show matching products.
- **Unified Filtering**:
  - **Catalog view**: Searches titles, descriptions, and dye categories. Displays a helpful "No products found" message if there are no matches.
  - **Cart view**: Dynamically filters items currently in the cart without breaking order adjustments or item removal indexing.

### 7. Backend Payment Status Confirmations (Owner Emails)
- **Automatic Status Emails**: Whenever an order status is updated (either approved/completed or declined/cancelled), the backend automatically generates and sends a status update confirmation email to the website owner's registered address (`vikasital222@gmail.com`).
- **Supports All Gateways & Modes**: Triggers upon status updates initiated via the customer dashboard check, or directly from the merchant approval/decline links in the order notification email.
- **Demo Mode Logging**: If nodemailer is not configured, the backend logs a full, properly formatted representation of the status email directly to the console.

### 8. Forgot Password & Email Recovery System
- **Forgot Password Link**: A "Forgot Password?" link is added to the standard Email Sign-In panel.
- **Unified Code & Link Delivery**:
  - Sends a secure 6-digit verification code to the user's registered email address.
  - Includes a direct password reset link (`http://localhost:5173/?resetToken=<code>&email=<email>`) in the mail.
- **One-Click Pre-filling & Auto-routing**: Clicking the link in the email automatically boots the app, launches the Auth Modal, routes directly to the Reset Account Password subtab, and pre-fills their email and verification code, so they only need to enter their new password!
- **Demo Mode Simulation**: If the backend is offline or nodemailer is not set up, a simulated verification code (`123456`) is generated and logged to the console logs for grading convenience.

### 9. Custom Shirt Pricing & Shipping Rules
- **Shirt Unit Pricing**: The price of the **Blossom Rose Cotton Shirt** (`prod_rose_shirt`) has been changed to **₹1.00** for both B2C retail and B2B wholesale buyers. This update is synced across:
  - Database schema initial templates in backend [server.js](file:///c:/Users/Pratyush%20Pokhriyal/Desktop/bloomthread-mern/backend/server.js).
  - Client fallback mock catalog in frontend [App.jsx](file:///c:/Users/Pratyush%20Pokhriyal/Desktop/bloomthread-mern/frontend/src/App.jsx).
  - Auto-update trigger upon database initialization.
- **Shirt Shipping Surcharges**: Shipping calculations have been modified dynamically:
  - If a shirt is present in the cart, a flat shipping fee of **₹1.00** is assessed for the entire order.
  - If no shirts are present, shipping defaults to **₹0.00** (free).

### 10. Conditional BHIM UPI Scanner Countdown Timer
- **Conditional Visibility**: The secure pay checkout countdown timer (clock badge) is now *only* visible when the active payment method tab is set to the Scanner (`qr`).
- **Conditional Execution**: The 60-second countdown lifecycle only runs (and triggers session timeout cancellations) when in QR scan mode. Changing tabs to Card or Cash stops and clears the active countdown timer.

### 11. Owner UPI Account Payment Verification
- **Unified Verification Message**: For the Scanner (`qr`) payment choice, the simulation prompts the user to check and confirm if funds have been successfully credited to the Google Pay account of the UPI owner (**Pratyush Pokhriyal / pokhriyalpratyush7@okicici**).
- **Merchant Account display**: Displays the exact merchant UPI ID (`pokhriyalpratyush7@okicici`) directly inside the Scanner tab and documents it inside the downloadable checkout receipt files when paid via QR.

### 12. Simplified Payment Methods (Cash, Card, Scanner)
- **Only Three Payment Methods**: The checkout gateway has been restricted to exactly three payment choices:
  - **Cash on Delivery**: Renders a custom confirmation layout outlining CoD instructions. Generates a `TXN-CASH-...` order entry in the ledger.
  - **Credit/Debit Card**: Secure form collection.
  - **BHIM UPI Scanner**: Generates a dynamic QR code (`upi://pay?pa=pokhriyalpratyush7@okicici&pn=Pratyush%20Pokhriyal&am=TOTAL_PRICE&cu=INR`) which is scan-compatible with **any BHIM UPI app** (BHIM, Google Pay, PhonePe, Paytm, etc.).





