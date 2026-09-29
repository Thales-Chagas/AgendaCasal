/**
 * Logger central. Regras:
 *   * Nunca registrar dados pessoais: e-mails, tokens e conteúdos são mascarados.
 *   * `debug` só existe em desenvolvimento.
 *   * Destinos são plugáveis (ex.: Sentry no futuro) via `addLogSink`.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

export type LogSink = (entry: LogEntry) => void;

const SENSITIVE_KEYS =
  /^(password|senha|token|access_token|refresh_token|authorization|email|e-mail|code|title|description|content|body|note|notes|location|display_name|name)$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER = /(bearer\s+)[A-Za-z0-9._-]+/gi;
const SECRET_KEY = /sb_(secret|publishable)_[A-Za-z0-9_-]+/g;

export function scrubText(text: string): string {
  return text
    .replace(JWT, '[jwt]')
    .replace(BEARER, '$1[token]')
    .replace(SECRET_KEY, '[key]')
    .replace(EMAIL, '[email]');
}

export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[…]';
  if (typeof value === 'string') return scrubText(value);
  if (value instanceof Error) return { name: value.name, message: scrubText(value.message) };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

const consoleSink: LogSink = (entry) => {
  const line = `[${entry.level}] ${entry.message}`;
  const args = entry.context ? [line, entry.context] : [line];
  if (entry.level === 'error') console.error(...args);
  else if (entry.level === 'warn') console.warn(...args);
  else console.log(...args);
};

const sinks: LogSink[] = [];
const devMode = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
if (devMode && process.env.NODE_ENV !== 'test') sinks.push(consoleSink);

export function addLogSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index >= 0) sinks.splice(index, 1);
  };
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (level === 'debug' && !devMode) return;
  const entry: LogEntry = {
    level,
    message: scrubText(message),
    context: context ? (scrub(context) as Record<string, unknown>) : undefined,
    timestamp: new Date().toISOString(),
  };
  for (const sink of sinks) {
    try {
      sink(entry);
    } catch {
      // Um destino com falha nunca derruba o app.
    }
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
