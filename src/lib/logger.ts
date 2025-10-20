// Simple logger with timestamps and leveled methods
export function logInfo(scope: string, message: string, data?: any) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] [INFO] [${scope}] ${message}`, sanitize(data));
  } else {
    console.log(`[${ts}] [INFO] [${scope}] ${message}`);
  }
}

export function logDebug(scope: string, message: string, data?: any) {
  const ts = new Date().toISOString();
  if (process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.log(`[${ts}] [DEBUG] [${scope}] ${message}`, sanitize(data));
    } else {
      console.log(`[${ts}] [DEBUG] [${scope}] ${message}`);
    }
  }
}

export function logError(scope: string, message: string, error?: any) {
  const ts = new Date().toISOString();
  if (error !== undefined) {
    console.error(`[${ts}] [ERROR] [${scope}] ${message}`, sanitize(error));
  } else {
    console.error(`[${ts}] [ERROR] [${scope}] ${message}`);
  }
}

function sanitize(obj: any) {
  try {
    if (obj && typeof obj === 'object') {
      const cloned: any = JSON.parse(JSON.stringify(obj));
      if (cloned.headers) delete cloned.headers;
      if (cloned.Authorization) delete cloned.Authorization;
      if (cloned.authorization) delete cloned.authorization;
      return cloned;
    }
  } catch {}
  return obj;
}


