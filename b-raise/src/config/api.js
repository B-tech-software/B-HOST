// ============================================
// API CONFIGURATION
// ============================================
// 
// ⚠️ IMPORTANT: Replace these placeholder values with your actual API endpoints and keys
// 
// This file contains configuration for:
// - Flask backend API endpoints
// - Paynow integration keys
// - Email service configuration
//
// ============================================

// ⚠️ REPLACE WITH YOUR FLASK BACKEND URL
// Example: "http://localhost:5000" for development
// Example: "https://api.b-raise.com" for production
// In Vite, env vars are read from import.meta.env and must start with VITE_
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// API Endpoints
export const API_ENDPOINTS = {
  // Events
  EVENTS: `${API_BASE_URL}/api/events`,
  EVENT_DETAILS: (id) => `${API_BASE_URL}/api/events/${id}`,
  CREATE_EVENT: `${API_BASE_URL}/api/events/create`,
  
  // Tickets
  PURCHASE_TICKET: `${API_BASE_URL}/api/tickets/purchase`,
  VERIFY_TICKET: `${API_BASE_URL}/api/tickets/verify`,
  USER_TICKETS: `${API_BASE_URL}/api/tickets/user`,
  RESEND_TICKET_EMAIL: `${API_BASE_URL}/api/tickets/resend-email`,
  
  // Payments (Paynow)
  INITIATE_PAYMENT: `${API_BASE_URL}/api/payments/initiate`,
  VERIFY_PAYMENT: `${API_BASE_URL}/api/payments/verify`,
  
  // Authentication
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,

  // Organizers and scanner security
  ORGANIZER_REGISTER: `${API_BASE_URL}/api/organizers/register`,
  ORGANIZER_STATUS: `${API_BASE_URL}/api/organizers/status`,
  ORGANIZER_EVENT_STATS: `${API_BASE_URL}/api/organizers/events/stats`,
  CREATE_SCANNER_CODES: `${API_BASE_URL}/api/organizers/scanner-codes/bulk-create`,
  REDEEM_SCANNER_CODE: `${API_BASE_URL}/api/organizers/scanner-codes/redeem`,
  ADMIN_PENDING_ORGANIZERS: `${API_BASE_URL}/api/organizers/pending`,
  ADMIN_REVIEW_ORGANIZER: `${API_BASE_URL}/api/organizers/review`,
  ADMIN_PENDING_EVENTS: `${API_BASE_URL}/api/organizers/admin/events/pending`,

  // Contact form
  CONTACT_SUBMIT: `${API_BASE_URL}/api/contact/submit`,
  ADMIN_REVIEW_EVENT: `${API_BASE_URL}/api/organizers/admin/events/review`,
  ADMIN_EVENT_STATS: `${API_BASE_URL}/api/organizers/admin/events/stats`,
};

// ============================================
// PAYNOW CONFIGURATION
// ============================================
// 
// ⚠️ REPLACE WITH YOUR PAYNOW CREDENTIALS
// Get these from your Paynow merchant account
//
export const PAYNOW_CONFIG = {
  // ⚠️ REPLACE WITH YOUR PAYNOW INTEGRATION ID
  INTEGRATION_ID: import.meta.env.VITE_PAYNOW_INTEGRATION_ID || "YOUR_PAYNOW_INTEGRATION_ID",
  
  // ⚠️ REPLACE WITH YOUR PAYNOW INTEGRATION KEY
  INTEGRATION_KEY: import.meta.env.VITE_PAYNOW_INTEGRATION_KEY || "YOUR_PAYNOW_INTEGRATION_KEY",
  
  // Paynow API URL (usually doesn't need to change)
  API_URL: "https://www.paynow.co.zw/interface/initiatetransaction",
  
  // Return URL after payment (update with your domain)
  RETURN_URL: import.meta.env.VITE_PAYNOW_RETURN_URL || "http://localhost:5173/payment/return",
  
  // Result URL for payment status updates (update with your backend endpoint)
  RESULT_URL: import.meta.env.VITE_PAYNOW_RESULT_URL || `${API_BASE_URL}/api/payments/result`,
};

// ============================================
// EMAIL SERVICE CONFIGURATION
// ============================================
// 
// ⚠️ REPLACE WITH YOUR EMAIL SERVICE CREDENTIALS
// Options: SMTP, SendGrid, Mailgun, etc.
//
export const EMAIL_CONFIG = {
  // Service type: 'smtp', 'sendgrid', 'mailgun', etc.
  SERVICE: import.meta.env.VITE_EMAIL_SERVICE || "smtp",
  
  // ⚠️ REPLACE WITH YOUR EMAIL SERVICE API KEY (if using third-party)
  API_KEY: import.meta.env.VITE_EMAIL_API_KEY || "YOUR_EMAIL_API_KEY",
  
  // ⚠️ REPLACE WITH YOUR FROM EMAIL ADDRESS
  FROM_EMAIL: import.meta.env.VITE_FROM_EMAIL || "noreply@b-raise.com",
  
  // ⚠️ REPLACE WITH YOUR FROM NAME
  FROM_NAME: import.meta.env.VITE_FROM_NAME || "B-raise",
};

// ============================================
// ENVIRONMENT VARIABLES SETUP
// ============================================
// 
// Create a .env file in the root directory with:
// 
// VITE_API_BASE_URL=http://localhost:5000
// VITE_PAYNOW_INTEGRATION_ID=your_integration_id
// VITE_PAYNOW_INTEGRATION_KEY=your_integration_key
// VITE_PAYNOW_RETURN_URL=http://localhost:5173/payment/return
// VITE_PAYNOW_RESULT_URL=http://localhost:5000/api/payments/result
// VITE_EMAIL_SERVICE=smtp
// VITE_EMAIL_API_KEY=your_email_api_key
// VITE_FROM_EMAIL=noreply@b-raise.com
// VITE_FROM_NAME=B-raise
//
// ⚠️ IMPORTANT: Add .env to .gitignore to keep your keys secure!
//





