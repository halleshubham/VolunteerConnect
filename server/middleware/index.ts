import { Express, json } from 'express';

export function registerMiddleware(app: Express) {
  // Configure express to handle larger JSON payloads
  app.use(json({ limit: '10mb' }));

  // Add additional middleware here as needed
}
