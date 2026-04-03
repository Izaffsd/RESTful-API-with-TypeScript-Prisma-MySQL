/**
 * OpenAPI 3.0 spec for Swagger UI at /api/v1/docs.
 * Extend paths/components as routes evolve.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Monash College Management API',
    description: 'REST API v1 — bearer JWT from Supabase (Authorization header or cookies per client).',
    version: '1.0.1',
  },
  servers: [{ url: '/api/v1', description: 'Current host' }],
  tags: [
    { name: 'Meta', description: 'API info and health' },
    { name: 'Auth', description: 'Registration, login, tokens, profile' },
    { name: 'Me', description: 'Current user profile' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token',
      },
    },
    schemas: {
      ApiRoot: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          apiVersion: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      HealthOk: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'Ok' },
          database: { type: 'string', example: 'connected' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ErrorBody: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errorCode: { type: 'string' },
          data: { nullable: true },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Meta'],
        summary: 'API welcome',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiRoot' } } },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Meta'],
        summary: 'Health check',
        description: 'Verifies database connectivity.',
        responses: {
          '200': {
            description: 'Database reachable',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthOk' } } },
          },
          '500': {
            description: 'Database error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'userType'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  userType: { type: 'string', enum: ['STUDENT', 'LECTURER', 'HEAD_LECTURER'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validation or conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK — sets cookies / returns tokens per implementation' },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh session',
        description: 'Uses refresh cookie; rate-limited.',
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user (auth namespace)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User payload' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
} as const
