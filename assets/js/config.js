// Public configuration only. NEVER place payment secrets in browser code.
window.NGO_CONFIG = Object.freeze({
  whatsapp: {
    // Country code + number, digits only. Primary contact from the Trust site.
    number: '917707007005',
    message: 'Hello, I would like to know more about Jan Seva Sangh Trust.'
  },
  career: {
    maxResumeBytes: 5 * 1024 * 1024,
    minFillMilliseconds: 3000,
    retryDelayMilliseconds: 15000
  },
  donationQR: {
    // Add ONLY the Trust's approved payment QR, then set confirmed to true.
    image: 'assets/images/donation-qr.png',
    confirmed: false
  },
  payment: {
    // Availability and public Checkout key ID are returned by the server.
    createOrderEndpoint: 'api/razorpay.php',
    verifyPaymentEndpoint: 'api/razorpay.php',
    currency: 'INR'
  }
});
