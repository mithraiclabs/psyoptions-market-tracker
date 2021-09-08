import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: process.env.LISTENER_LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'Listener' },
  transports: [
    new transports.Console()
  ]
})