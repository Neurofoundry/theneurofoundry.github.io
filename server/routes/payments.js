const express = require('express');
const crypto = require('crypto');
const { authMiddleware, requireEmailVerification } = require('../middleware/auth');
const { db, dbType } = require('../config/database');
const {
  buildPublicUrl,
  createPayment,
  createPaymentLink,
  getClientConfig,
  getProduct,
  verifySquareWebhookSignature
} = require('../services/squareCheckoutService');
const { findUserById, updateUser } = require('../services/userService');

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parsePaymentNote(note) {
  return String(note || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((parsed, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return parsed;
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (key) parsed[key] = value;
      return parsed;
    }, {});
}

function isCompletedPaymentEvent(event) {
  const payment = event?.data?.object?.payment;
  return !!payment && String(payment.status || '').toUpperCase() === 'COMPLETED';
}

function createConfirmationId() {
  return String(crypto.randomInt(100000000, 1000000000));
}

async function confirmationIdExistsForAnotherUser(confirmationId, userId) {
  if (dbType === 'cloudflare_d1') {
    const rows = await db.query(
      'SELECT id FROM users WHERE id != ? AND metadata LIKE ? LIMIT 1',
      [userId, `%${confirmationId}%`]
    );
    return rows.length > 0;
  }

  if (typeof db.entries !== 'function') return false;

  for (const [id, user] of db.entries()) {
    if (id === userId) continue;
    const metadata = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    if (JSON.stringify(metadata).includes(confirmationId)) return true;
  }

  return false;
}

async function createUniqueConfirmationId(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const confirmationId = createConfirmationId();
    if (!(await confirmationIdExistsForAnotherUser(confirmationId, userId))) {
      return confirmationId;
    }
  }

  const error = new Error('Could Not Generate A Unique Confirmation Number.');
  error.statusCode = 503;
  throw error;
}

async function markSkeletonKeyPurchase({ user, productId, confirmationId, payment }) {
  if (!user || productId !== 'skeleton_key' || !payment) return;

  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const squareCheckout = metadata.squareCheckout && typeof metadata.squareCheckout === 'object'
    ? metadata.squareCheckout
    : {};
  const pending = squareCheckout.pending && typeof squareCheckout.pending === 'object'
    ? squareCheckout.pending
    : {};
  const completedAt = payment.updated_at || payment.created_at || new Date().toISOString();
  const paymentKey = payment.order_id || payment.id;

  await updateUser(user.id, {
    billingId: payment.id,
    metadata: {
      ...metadata,
      skeletonKeyPurchase: {
        purchased: true,
        status: 'paid',
        productId,
        confirmationId: confirmationId || null,
        email: user.email,
        purchasedAt: completedAt,
        squarePaymentId: payment.id,
        squareOrderId: payment.order_id || null,
        receiptUrl: payment.receipt_url || null
      },
      squareCheckout: {
        ...squareCheckout,
        lastCompletedPaymentId: payment.id,
        lastCompletedOrderId: payment.order_id || null,
        lastCompletedAt: completedAt,
        pending: {
          ...pending,
          [paymentKey]: {
            ...(pending[paymentKey] || {}),
            productId,
            confirmationId: confirmationId || null,
            email: user.email,
            status: 'paid',
            paymentId: payment.id,
            completedAt
          }
        }
      }
    }
  });
}

router.get('/config', (req, res, next) => {
  try {
    return res.json({
      success: true,
      square: getClientConfig()
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:productId', (req, res, next) => {
  try {
    const product = getProduct(req.params.productId);

    return res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        amount: product.amount,
        currency: product.currency
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/checkout', authMiddleware, requireEmailVerification, async (req, res, next) => {
  try {
    const productId = String(req.body.productId || 'skeleton_key').trim();
    const product = getProduct(productId);
    const confirmedEmail = normalizeEmail(req.body.email);
    const accountEmail = normalizeEmail(req.user.email);

    if (!confirmedEmail || confirmedEmail !== accountEmail) {
      return res.status(403).json({
        success: false,
        message: 'Email Does Not Match Signed-In Account.'
      });
    }

    const confirmationId = await createUniqueConfirmationId(req.user.id);
    const redirectUrl = buildPublicUrl(req, `/checkout/skeleton-key/success/?product=${encodeURIComponent(product.id)}&confirmation=${encodeURIComponent(confirmationId)}`);
    const buyer = { email: req.user.email, phone: req.user.phone };
    const noteParts = [
      `neurofoundry_product=${product.id}`,
      `user_id=${req.user.id}`,
      `email=${buyer.email}`,
      `confirmation_id=${confirmationId}`
    ].filter(Boolean);
    const paymentLink = await createPaymentLink({
      productId: product.id,
      buyer,
      redirectUrl,
      note: noteParts.join('; ')
    });

    const metadata = req.user.metadata && typeof req.user.metadata === 'object' ? req.user.metadata : {};
    const squareCheckout = metadata.squareCheckout && typeof metadata.squareCheckout === 'object'
      ? metadata.squareCheckout
      : {};
    const pending = squareCheckout.pending && typeof squareCheckout.pending === 'object'
      ? squareCheckout.pending
      : {};
    const pendingKey = paymentLink.orderId || paymentLink.id;

    await updateUser(req.user.id, {
      metadata: {
        ...metadata,
        squareCheckout: {
          ...squareCheckout,
          lastPaymentLinkId: paymentLink.id,
          lastOrderId: paymentLink.orderId,
          lastProductId: product.id,
          lastCheckoutStartedAt: new Date().toISOString(),
          pending: {
            ...pending,
            [pendingKey]: {
              productId: product.id,
              paymentLinkId: paymentLink.id,
              orderId: paymentLink.orderId,
              confirmationId,
              email: buyer.email,
              status: 'pending',
              startedAt: new Date().toISOString()
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      checkoutUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.orderId,
      environment: paymentLink.environment
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/charge', authMiddleware, requireEmailVerification, async (req, res, next) => {
  try {
    const productId = String(req.body.productId || 'skeleton_key').trim();
    const product = getProduct(productId);
    const confirmedEmail = normalizeEmail(req.body.email);
    const accountEmail = normalizeEmail(req.user.email);
    const sourceId = String(req.body.sourceId || '').trim();
    const buyerName = String(req.body.buyerName || req.user.name || '').trim();

    if (!confirmedEmail || confirmedEmail !== accountEmail) {
      return res.status(403).json({
        success: false,
        message: 'Email Does Not Match Signed-In Account.'
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Source Is Required.'
      });
    }

    const confirmationId = await createUniqueConfirmationId(req.user.id);
    const noteParts = [
      `neurofoundry_product=${product.id}`,
      `user_id=${req.user.id}`,
      `email=${req.user.email}`,
      `confirmation_id=${confirmationId}`
    ];
    const payment = await createPayment({
      productId: product.id,
      sourceId,
      buyer: {
        email: req.user.email,
        name: buyerName
      },
      note: noteParts.join('; '),
      referenceId: confirmationId
    });

    if (String(payment.status || '').toUpperCase() !== 'COMPLETED') {
      return res.status(402).json({
        success: false,
        message: 'Payment Was Not Completed.',
        status: payment.status || null
      });
    }

    await markSkeletonKeyPurchase({
      user: req.user,
      productId: product.id,
      confirmationId,
      payment
    });

    return res.json({
      success: true,
      confirmationId,
      orderId: payment.order_id || payment.id,
      paymentId: payment.id,
      receiptUrl: payment.receipt_url || null
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/square/webhook', async (req, res) => {
  const rawBody = req.body;
  const signature = req.get('x-square-hmacsha256-signature');
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (notificationUrl && !verifySquareWebhookSignature({ signature, rawBody, notificationUrl })) {
    return res.status(403).json({ success: false, message: 'Invalid Square webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '{}'));
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid Square webhook payload' });
  }

  console.log('Square webhook received', {
    eventId: event.event_id,
    type: event.type,
    merchantId: event.merchant_id,
    createdAt: event.created_at
  });

  if (isCompletedPaymentEvent(event)) {
    const payment = event.data.object.payment;
    const note = parsePaymentNote(payment.note);
    const userId = note.user_id;
    const productId = note.neurofoundry_product;

    if (userId && productId === 'skeleton_key') {
      try {
        const user = await findUserById(userId);
        if (user && normalizeEmail(user.email) === normalizeEmail(note.email)) {
          await markSkeletonKeyPurchase({
            user,
            productId,
            confirmationId: note.confirmation_id || null,
            payment
          });
        }
      } catch (error) {
        console.error('Failed to update Skeleton Key purchase metadata:', error);
      }
    }
  }

  return res.json({ success: true });
});

module.exports = router;
