const EventEmitter = require('events');

/**
 * Simple Event Bus for microservices communication
 * In AWS, this will be replaced with EventBridge or SNS/SQS
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase for multiple services
  }

  /**
   * Publish an event
   * @param {string} eventName - Event name (e.g., 'order.created')
   * @param {object} data - Event payload
   */
  publish(eventName, data) {
    console.log(`[EventBus] Publishing: ${eventName}`, data);
    this.emit(eventName, {
      eventName,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name to listen for
   * @param {function} handler - Handler function
   */
  subscribe(eventName, handler) {
    console.log(`[EventBus] Subscribing to: ${eventName}`);
    this.on(eventName, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {function} handler - Handler function
   */
  unsubscribe(eventName, handler) {
    this.off(eventName, handler);
  }
}

// Singleton instance
const eventBus = new EventBus();

// Event name constants
const Events = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_DEACTIVATED: 'user.deactivated',
  
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_OUT_OF_STOCK: 'product.out_of_stock',
  
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Cart events
  CART_ITEM_ADDED: 'cart.item_added',
  CART_ITEM_REMOVED: 'cart.item_removed',
  CART_CLEARED: 'cart.cleared',
};

module.exports = {
  eventBus,
  Events,
};
