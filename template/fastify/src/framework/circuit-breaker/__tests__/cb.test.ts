// ./src/framework/circuit-breaker/__tests__/cb.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { createCircuitBreaker, createCircuitBreakerError, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";

/**
 * The circuit breaker now guards Redis, cache, sessions, storage, mail, the
 * realtime relay, scheduler locks and the Socket.IO adapter. A bug here is not
 * a slow feature: it either stops all traffic to an otherwise healthy service
 * or lets a dead one keep taking requests. These tests pin the state machine
 * and, just as importantly, how callers are expected to recognise an open
 * circuit (`isCircuitBreakerError`) so they can fall back instead of crashing.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("circuit breaker", () => {
  it("passes results through while closed", async () => {
    const breaker = createCircuitBreaker({ name: "Test" });

    await expect(breaker.exec(async () => "ok")).resolves.toBe("ok");
    expect(breaker.getState()).toBe("closed");
  });

  it("trips after the failure threshold and then fails fast", async () => {
    const breaker = createCircuitBreaker({ name: "Test", failureThreshold: 2 });
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(breaker.exec(failing)).rejects.toThrow("boom");
    await expect(breaker.exec(failing)).rejects.toThrow("boom");
    expect(breaker.getState()).toBe("open");

    const blocked = vi.fn(async () => "never");
    const error = await breaker.exec(blocked).catch((caught) => caught);

    expect(blocked).not.toHaveBeenCalled();
    expect(isCircuitBreakerError(error)).toBe(true);
    expect((error as Error).message).toContain("Test");
  });

  it("resets the failure count after a success", async () => {
    const breaker = createCircuitBreaker({ name: "Test", failureThreshold: 2 });
    const failing = async () => {
      throw new Error("boom");
    };

    await breaker.exec(failing).catch(() => {});
    await breaker.exec(async () => "ok");
    await breaker.exec(failing).catch(() => {});

    expect(breaker.getState()).toBe("closed");
  });

  it("moves to half-open after the reset timeout and closes on success", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    const breaker = createCircuitBreaker({ name: "Test", failureThreshold: 1, resetTimeout: 1000 });

    await breaker
      .exec(async () => {
        throw new Error("down");
      })
      .catch(() => {});
    expect(breaker.getState()).toBe("open");

    clock = 1000;
    await expect(breaker.exec(async () => "recovered")).resolves.toBe("recovered");
    expect(breaker.getState()).toBe("closed");
  });

  it("re-opens when the half-open probe fails", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    const breaker = createCircuitBreaker({ name: "Test", failureThreshold: 1, resetTimeout: 1000 });

    await breaker
      .exec(async () => {
        throw new Error("down");
      })
      .catch(() => {});

    clock = 1000;
    await expect(
      breaker.exec(async () => {
        throw new Error("still down");
      })
    ).rejects.toThrow("still down");

    expect(breaker.getState()).toBe("open");
  });

  it("allows only one probe while half-open", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    const breaker = createCircuitBreaker({
      name: "Test",
      failureThreshold: 1,
      resetTimeout: 1000,
      successThreshold: 2
    });

    await breaker
      .exec(async () => {
        throw new Error("down");
      })
      .catch(() => {});

    clock = 1000;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const probe = breaker.exec(async () => {
      await gate;
      return "first";
    });

    await expect(breaker.exec(async () => "second")).rejects.toThrow(/Circuit breaker is open for Test/);

    release();
    await expect(probe).resolves.toBe("first");
  });
});

describe("isCircuitBreakerError", () => {
  it("recognises the error the breaker throws", () => {
    const error = createCircuitBreakerError("Payments");

    expect(error.name).toBe("CircuitBreakerOpenError");
    expect(error.message).toContain("Payments");
    expect(isCircuitBreakerError(error)).toBe(true);
  });

  it("rejects ordinary errors and non-errors", () => {
    expect(isCircuitBreakerError(new Error("nope"))).toBe(false);
    expect(isCircuitBreakerError(null)).toBe(false);
    expect(isCircuitBreakerError(undefined)).toBe(false);
    expect(isCircuitBreakerError("nope")).toBe(false);
  });
});
