/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when service is down
 * States: CLOSED (working) → OPEN (failing) → HALF_OPEN (testing recovery)
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.serviceName = options.serviceName || 'unknown';
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        console.log(`[CircuitBreaker] ${this.serviceName} is OPEN - failing fast`);
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
      // Time to try again
      this.state = 'HALF_OPEN';
      console.log(`[CircuitBreaker] ${this.serviceName} entering HALF_OPEN state`);
    }

    try {
      const result = await fn();
      return this.onSuccess(result);
    } catch (error) {
      return this.onFailure(error);
    }
  }

  onSuccess(result) {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log(`[CircuitBreaker] ${this.serviceName} recovered - CLOSED`);
      }
    }

    return result;
  }

  onFailure(error) {
    this.failureCount++;
    console.log(`[CircuitBreaker] ${this.serviceName} failure ${this.failureCount}/${this.failureThreshold}`);

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log(`[CircuitBreaker] ${this.serviceName} tripped - OPEN for ${this.timeout}ms`);
    }

    throw error;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`[CircuitBreaker] ${this.serviceName} manually reset`);
  }
}

module.exports = CircuitBreaker;
