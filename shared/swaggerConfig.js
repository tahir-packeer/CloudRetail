/**
 * Basic Swagger/OpenAPI Configuration
 * For AWS: Use API Gateway with OpenAPI specification
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CloudRetail E-commerce API',
    version: '1.0.0',
    description: 'Microservices-based e-commerce platform APIs',
    contact: {
      name: 'Tahir Nasoordeen Packeer',
      email: 'tahirpackeer@gmail.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server (API Gateway)',
    },
    {
      url: 'https://api.cloudretail.com',
      description: 'Production server (AWS API Gateway)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          error: { type: 'string', example: 'Detailed error (dev mode only)' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          role: { type: 'string', enum: ['buyer', 'seller', 'admin'], example: 'buyer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Product Name' },
          description: { type: 'string', example: 'Product description' },
          price: { type: 'number', format: 'decimal', example: 99.99 },
          stock: { type: 'integer', example: 100 },
          category: { type: 'string', example: 'Electronics' },
          imageUrl: { type: 'string', example: '/uploads/product-123.jpg' },
          sellerId: { type: 'integer', example: 5 },
          status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          userId: { type: 'integer', example: 10 },
          total: { type: 'number', format: 'decimal', example: 250.50 },
          status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], example: 'pending' },
          paymentStatus: { type: 'string', enum: ['pending', 'succeeded', 'failed'], example: 'pending' },
          shippingAddress: { type: 'object' },
          items: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and user management' },
    { name: 'Products', description: 'Product catalog management' },
    { name: 'Cart', description: 'Shopping cart operations' },
    { name: 'Orders', description: 'Order management' },
    { name: 'Payments', description: 'Payment processing (Stripe)' },
    { name: 'Analytics', description: 'Business analytics and metrics' },
  ],
};

module.exports = swaggerDefinition;
