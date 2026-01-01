// Lightweight OpenTelemetry initialization for the frontend (development-only)
(function(){
  try {
    if (!window.location.hostname || !window.location.hostname.includes('localhost')) {
      // Disable by default unless on localhost/dev
      console.log('[tracing] Skipping tracing (not localhost)');
      return;
    }

    if (!window.opentelemetry) {
      console.warn('[tracing] OpenTelemetry libraries not loaded');
      return;
    }

    const { WebTracerProvider } = window.opentelemetry.sdkTraceWeb || {};
    const { OTLPTraceExporter } = window.opentelemetry.exporterTraceOtlpHttp || {};
    const { registerInstrumentations } = window.opentelemetry.instrumentation || {};
    const { DocumentLoadInstrumentation } = window.opentelemetry.instrumentationDocumentLoad || {};
    const { FetchInstrumentation } = window.opentelemetry.instrumentationFetch || {};
    const { XMLHttpRequestInstrumentation } = window.opentelemetry.instrumentationXmlHttpRequest || {};
    const { SimpleSpanProcessor } = window.opentelemetry.sdkTraceBase || {};

    if (!WebTracerProvider || !OTLPTraceExporter || !SimpleSpanProcessor || !registerInstrumentations) {
      console.warn('[tracing] Required OTEL constructors not available');
      return;
    }

    const provider = new WebTracerProvider();
    const exporter = new OTLPTraceExporter({ url: 'http://localhost:4319/v1/traces' });
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();

    registerInstrumentations({
      instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({ ignoreUrls: [/eden-chat/], propagateTraceHeaderCorsUrls: [/./] }),
        new XMLHttpRequestInstrumentation(),
      ]
    });

    // Expose a tracer for app code to create custom spans
    window.otelTracer = provider.getTracer('neurofoundry-frontend');
    console.log('[tracing] Frontend OpenTelemetry initialized (local)');
  } catch (e) {
    console.error('[tracing] Init failed', e);
  }
})();