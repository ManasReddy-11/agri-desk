/**
 * Request Logger Middleware
 * Logs incoming requests with timing information
 */

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture the end of response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? '❌' : '✓';

    console.log(
      `${logLevel} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

export default requestLogger;
