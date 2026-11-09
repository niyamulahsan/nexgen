// Factory for the error
export function createCircuitBreakerError(serviceName: string) {
  const error = new Error(`Circuit breaker is open for ${serviceName}. Service is temporarily unavailable.`);
  // Attach a custom property to identify it
  Object.assign(error, { name: "CircuitBreakerOpenError", isCircuitBreakerError: true });
  return error;
}

// Functional Type Guard
export function isCircuitBreakerError(error: unknown): error is Error {
  return error instanceof Error && (error as any).isCircuitBreakerError === true;
}

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  resetTimeout?: number;
  successThreshold?: number;
}

export function createCircuitBreaker({
  name = "Unknown Service",
  failureThreshold = 3,
  resetTimeout = 30000,
  successThreshold = 1
}: CircuitBreakerOptions = {}) {
  let state: "closed" | "open" | "half-open" = "closed";
  let failureCount = 0;
  let successCount = 0;
  let lastFailureTime = 0;
  let isHalfOpenTestRunning = false;

  function trip() {
    state = "open";
    lastFailureTime = Date.now();
  }

  function reset() {
    state = "closed";
    failureCount = 0;
    successCount = 0;
  }

  return {
    async exec<T>(fn: () => Promise<T>): Promise<T> {
      if (state === "open") {
        if (Date.now() - lastFailureTime >= resetTimeout) {
          state = "half-open";
          successCount = 0;
          isHalfOpenTestRunning = false;
        } else {
          throw createCircuitBreakerError(name);
        }
      }

      if (state === "half-open") {
        if (isHalfOpenTestRunning) {
          throw createCircuitBreakerError(name);
        }
        isHalfOpenTestRunning = true;
      }

      try {
        const result = await fn();
        if (state === "half-open") {
          successCount++;
          if (successCount >= successThreshold) reset();
        }
        failureCount = 0;
        return result;
      } catch (error) {
        failureCount++;
        if (failureCount >= failureThreshold || state === "half-open") {
          trip();
        }
        throw error;
      } finally {
        if (state === "half-open") isHalfOpenTestRunning = false;
      }
    },

    getState() {
      return state;
    }
  };
}

export type CircuitBreaker = ReturnType<typeof createCircuitBreaker>;
