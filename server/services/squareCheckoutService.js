const crypto = require('crypto');

const SQUARE_API_VERSION = process.env.SQUARE_API_VERSION || '2026-01-22';

const productCatalog = {
  skeleton_key: {
    id: 'skeleton_key',
    name: process.env.SQUARE_SKELETON_KEY_NAME || 'Skeleton Key',
    description: 'Aegis: Skeleton Key desktop access',
    amount: parseInt(process.env.SQUARE_SKELETON_KEY_PRICE_CENTS || '0', 10),
    currency: process.env.SQUARE_CURRENCY || 'USD'
  },
  reticon_v2: {
    id: 'reticon_v2',
    name: process.env.SQUARE_RETICON_NAME || 'Reticon',
    description: 'Reticon custom reticle builder lifetime access',
    amount: parseInt(process.env.SQUARE_RETICON_PRICE_CENTS || '299', 10),
    currency: process.env.SQUARE_CURRENCY || 'USD'
  }
};

function getSquareConfig() {
  const environment = String(process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  const applicationId = process.env.SQUARE_APPLICATION_ID || process.env.SQUARE_APP_ID;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const baseUrl = environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  return {
    applicationId,
    accessToken,
    locationId,
    baseUrl,
    environment
  };
}

function getClientConfig() {
  const config = getSquareConfig();

  if (!config.applicationId || !config.locationId) {
    const error = new Error('Square client checkout is not configured');
    error.statusCode = 503;
    throw error;
  }

  return {
    applicationId: config.applicationId,
    locationId: config.locationId,
    environment: config.environment,
    sdkUrl: config.environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js'
  };
}

function getProduct(productId) {
  const product = productCatalog[productId];

  if (!product) {
    const error = new Error('Unknown checkout product');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(product.amount) || product.amount <= 0) {
    const error = new Error('Checkout product price is not configured');
    error.statusCode = 503;
    throw error;
  }

  return product;
}

function buildPublicUrl(req, path) {
  const configuredBase = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || process.env.APP_URL;
  const base = configuredBase || `${req.protocol}://${req.get('host')}`;
  return new URL(path, base).toString();
}

async function createPaymentLink({ productId, buyer, redirectUrl, note }) {
  const config = getSquareConfig();

  if (!config.accessToken || !config.locationId) {
    const error = new Error('Square checkout is not configured');
    error.statusCode = 503;
    throw error;
  }

  const product = getProduct(productId);
  const body = {
    idempotency_key: crypto.randomUUID(),
    quick_pay: {
      name: product.name,
      price_money: {
        amount: product.amount,
        currency: product.currency
      },
      location_id: config.locationId
    },
    checkout_options: {
      redirect_url: redirectUrl
    },
    payment_note: note || product.description
  };

  if (buyer && buyer.email) {
    body.pre_populated_data = {
      buyer_email: buyer.email,
      buyer_phone_number: buyer.phone || undefined
    };
  }

  const response = await fetch(`${config.baseUrl}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_API_VERSION
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.errors && data.errors[0] && data.errors[0].detail
      ? data.errors[0].detail
      : 'Square checkout request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.squareErrors = data.errors || [];
    throw error;
  }

  return {
    id: data.payment_link && data.payment_link.id,
    orderId: data.payment_link && data.payment_link.order_id,
    url: data.payment_link && data.payment_link.url,
    environment: config.environment
  };
}

async function createPayment({ productId, sourceId, buyer, note, referenceId, amount, currency }) {
  const config = getSquareConfig();

  if (!config.accessToken || !config.locationId) {
    const error = new Error('Square checkout is not configured');
    error.statusCode = 503;
    throw error;
  }

  if (!sourceId) {
    const error = new Error('Square payment source is required');
    error.statusCode = 400;
    throw error;
  }

  const product = productId ? getProduct(productId) : null;
  const paymentAmount = amount == null ? product.amount : amount;
  const paymentCurrency = currency || (product && product.currency) || process.env.SQUARE_CURRENCY || 'USD';

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    const error = new Error('Payment amount is invalid');
    error.statusCode = 400;
    throw error;
  }
  const body = {
    idempotency_key: crypto.randomUUID(),
    source_id: sourceId,
    amount_money: {
      amount: paymentAmount,
      currency: paymentCurrency
    },
    location_id: config.locationId,
    autocomplete: true,
    note: note || (product && product.description) || 'Neurofoundry support donation'
  };

  if (buyer && buyer.email) {
    body.buyer_email_address = buyer.email;
  }

  if (referenceId) {
    body.reference_id = referenceId;
  }

  const response = await fetch(`${config.baseUrl}/v2/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_API_VERSION
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.errors && data.errors[0] && data.errors[0].detail
      ? data.errors[0].detail
      : 'Square payment request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.squareErrors = data.errors || [];
    throw error;
  }

  return data.payment;
}

function verifySquareWebhookSignature({ signature, rawBody, notificationUrl }) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signatureKey || !notificationUrl || !signature || !rawBody) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expected = crypto
    .createHmac('sha256', signatureKey)
    .update(notificationUrl + body)
    .digest('base64');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

module.exports = {
  buildPublicUrl,
  createPayment,
  createPaymentLink,
  getClientConfig,
  getProduct,
  verifySquareWebhookSignature
};
