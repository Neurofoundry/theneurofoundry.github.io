/**
 * Email Orchestrator
 * Event-driven delivery pipeline for transactional emails.
 * Current transport is in-process queue with retry/backoff.
 */

const crypto = require('crypto');
const { sendVerificationEmail } = require('./emailService');

const queue = [];
const jobLog = [];
const idempotencyIndex = new Map();

let processing = false;

const MAX_LOG_ENTRIES = 200;
const MAX_ATTEMPTS = 3;

function nowIso() {
  return new Date().toISOString();
}

function makeJobId() {
  return `job_${crypto.randomBytes(8).toString('hex')}`;
}

function makeEventId() {
  return `evt_${crypto.randomBytes(8).toString('hex')}`;
}

function pushJobLog(entry) {
  jobLog.push({
    timestamp: nowIso(),
    ...entry
  });
  if (jobLog.length > MAX_LOG_ENTRIES) {
    jobLog.shift();
  }
}

function sanitizeUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    createdAt: user.createdAt || null
  };
}

function makeIdempotencyKey(eventType, user) {
  return `${eventType}:${user.id}`;
}

function enqueueUserRegisteredEmail(user, context = {}) {
  const eventType = 'user.registered';
  const eventId = makeEventId();
  const idempotencyKey = makeIdempotencyKey(eventType, user);
  const existing = idempotencyIndex.get(idempotencyKey);

  if (existing && (existing.status === 'queued' || existing.status === 'sent')) {
    const skipped = {
      queued: false,
      skipped: true,
      reason: 'idempotent_duplicate',
      eventType,
      eventId,
      idempotencyKey,
      jobId: existing.jobId
    };
    pushJobLog({
      type: 'delivery_skipped',
      ...skipped,
      user: sanitizeUserPayload(user)
    });
    return skipped;
  }

  const job = {
    jobId: makeJobId(),
    eventId,
    eventType,
    idempotencyKey,
    payload: {
      user: sanitizeUserPayload(user),
      requestId: context.requestId || null,
      createdAt: nowIso()
    },
    state: 'queued',
    attempts: 0,
    nextAttemptAt: Date.now()
  };

  idempotencyIndex.set(idempotencyKey, {
    jobId: job.jobId,
    status: 'queued',
    updatedAt: nowIso()
  });

  queue.push(job);
  pushJobLog({
    type: 'delivery_queued',
    eventType,
    eventId,
    jobId: job.jobId,
    idempotencyKey,
    state: job.state,
    attempts: job.attempts,
    user: job.payload.user
  });

  scheduleDrainQueue();

  return {
    queued: true,
    skipped: false,
    eventType,
    eventId,
    idempotencyKey,
    jobId: job.jobId,
    state: job.state
  };
}

function computeBackoffMs(attempt) {
  if (attempt <= 1) return 1000;
  if (attempt === 2) return 4000;
  return 12000;
}

async function executeJob(job) {
  if (job.eventType !== 'user.registered') {
    throw new Error(`Unsupported event type: ${job.eventType}`);
  }

  const emailResult = await sendVerificationEmail(job.payload.user);
  if (!emailResult || !emailResult.sent) {
    throw new Error(emailResult?.reason || 'verification_email_not_sent');
  }

  return emailResult;
}

function markIdempotency(job, status) {
  idempotencyIndex.set(job.idempotencyKey, {
    jobId: job.jobId,
    status,
    updatedAt: nowIso()
  });
}

async function processJob(job) {
  job.attempts += 1;
  job.state = 'processing';

  pushJobLog({
    type: 'delivery_processing',
    eventType: job.eventType,
    eventId: job.eventId,
    jobId: job.jobId,
    idempotencyKey: job.idempotencyKey,
    state: job.state,
    attempts: job.attempts,
    user: job.payload.user
  });

  try {
    const emailResult = await executeJob(job);
    job.state = 'sent';
    markIdempotency(job, 'sent');
    pushJobLog({
      type: 'delivery_sent',
      eventType: job.eventType,
      eventId: job.eventId,
      jobId: job.jobId,
      idempotencyKey: job.idempotencyKey,
      state: job.state,
      attempts: job.attempts,
      user: job.payload.user,
      messageId: emailResult.messageId || null,
      mode: emailResult.mode || null
    });
  } catch (error) {
    if (job.attempts < MAX_ATTEMPTS) {
      job.state = 'retry_scheduled';
      markIdempotency(job, 'retry_scheduled');
      const backoffMs = computeBackoffMs(job.attempts);
      job.nextAttemptAt = Date.now() + backoffMs;

      pushJobLog({
        type: 'delivery_retry_scheduled',
        eventType: job.eventType,
        eventId: job.eventId,
        jobId: job.jobId,
        idempotencyKey: job.idempotencyKey,
        state: job.state,
        attempts: job.attempts,
        backoffMs,
        error: error.message,
        user: job.payload.user
      });

      setTimeout(() => {
        queue.push(job);
        scheduleDrainQueue();
      }, backoffMs);
      return;
    }

    job.state = 'failed';
    markIdempotency(job, 'failed');
    pushJobLog({
      type: 'delivery_failed',
      eventType: job.eventType,
      eventId: job.eventId,
      jobId: job.jobId,
      idempotencyKey: job.idempotencyKey,
      state: job.state,
      attempts: job.attempts,
      error: error.message,
      user: job.payload.user
    });
  }
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  try {
    while (queue.length > 0) {
      const job = queue.shift();

      if (job.nextAttemptAt && Date.now() < job.nextAttemptAt) {
        queue.push(job);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await processJob(job);
    }
  } finally {
    processing = false;
  }
}

function scheduleDrainQueue() {
  setTimeout(() => {
    drainQueue().catch((error) => {
      pushJobLog({
        type: 'orchestrator_error',
        error: error.message
      });
    });
  }, 0);
}

function getEmailDeliveryLog() {
  return [...jobLog];
}

function getEmailQueueSnapshot() {
  return {
    pending: queue.map((job) => ({
      jobId: job.jobId,
      eventType: job.eventType,
      state: job.state,
      attempts: job.attempts,
      nextAttemptAt: job.nextAttemptAt
    })),
    processing
  };
}

module.exports = {
  enqueueUserRegisteredEmail,
  getEmailDeliveryLog,
  getEmailQueueSnapshot
};
