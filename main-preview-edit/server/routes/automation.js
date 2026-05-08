const express = require('express');
const automationService = require('../services/playwrightAutomation');

const router = express.Router();

router.get('/ready', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await automationService.getReadyState(req.get('origin') || '')
    });
  } catch (error) {
    next(error);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await automationService.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/events', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    send({
      type: 'snapshot',
      timestamp: new Date().toISOString(),
      data: await automationService.getStatus()
    });

    const unsubscribe = automationService.subscribe(send);

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  } catch (error) {
    next(error);
  }
});

router.post('/command', async (req, res, next) => {
  try {
    const { command } = req.body || {};
    const accepted = await automationService.enqueueCommand(command);
    res.status(202).json({
      success: true,
      data: accepted
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/start', async (req, res, next) => {
  try {
    const session = await automationService.ensureSession();
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/stop', async (req, res, next) => {
  try {
    const result = await automationService.stopSession();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
