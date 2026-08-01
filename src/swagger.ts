export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Mandtech Services API',
    version: '1.0.0',
    description: 'REST API powering Mandtech Services Customer Site and Admin Dashboard.',
    contact: {
      name: 'Mandtech Engineering Team',
      email: 'support@mandtech.com.ng'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from POST /api/auth/login'
      }
    },
    schemas: {
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Sullair 185 Series' },
          category: { type: 'string', enum: ['Air Compressors', 'Generators', 'Pumps', 'Air Dryers'] },
          brand: { type: 'string', example: 'Sullair' },
          driven_type: { type: 'string', enum: ['Electric', 'Diesel Driven'] },
          capacity: { type: 'integer', example: 185 },
          badge: { type: 'string', nullable: true, example: 'IN STOCK' },
          specs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                icon_name: { type: 'string' }
              }
            }
          },
          image_url: { type: 'string' },
          is_active: { type: 'boolean' }
        }
      },
      Part: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'High-Pressure Oil Filter' },
          category: { type: 'string', enum: ['Air Filtration', 'Control Systems', 'Electrical Spares', 'Mechanical Gaskets'] },
          brand: { type: 'string', example: 'Sullair' },
          sku: { type: 'string', example: 'SL-98230-XP' },
          compatibility: { type: 'string', example: 'LS Series, 16-25 Series Compressors' },
          condition: { type: 'string', enum: ['New OEM', 'Refurbished'] },
          badge: { type: 'string', example: 'IN STOCK' },
          image_url: { type: 'string' },
          is_active: { type: 'boolean' }
        }
      },
      Inquiry: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Kola Adesina' },
          company: { type: 'string', example: 'Dangote Fertilizer Annex' },
          email: { type: 'string', example: 'k.adesina@dangote.com' },
          phone: { type: 'string', example: '+234 803 123 4567' },
          message: { type: 'string', example: 'Sizing specs and dispatch schedules needed.' },
          equipment_interests: { type: 'array', items: { type: 'string' } },
          newsletter_opt_in: { type: 'boolean' }
        }
      },
      ServiceTicket: {
        type: 'object',
        properties: {
          asset_serial_id: { type: 'string', example: 'SL-185-8294A' },
          service_type: {
            type: 'string',
            enum: ['Preventive Maintenance', 'Emergency Breakdown Servicing', 'Equipment Installation', 'Calibration & Diagnostic Check']
          },
          description: { type: 'string', example: 'Compressor pressure drop during peak operation.' },
          urgency: { type: 'string', enum: ['Standard Route', 'High Priority', 'Emergency Site Breakdown'] },
          authorize_dispatch: { type: 'boolean', example: true }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          200: { description: 'Server operational' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Admin & Staff Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@mandtech.com.ng' },
                  password: { type: 'string', example: 'mandtech_admin_2024' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful, returns JWT bearer token' },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/api/products': {
      get: {
        summary: 'List products with filters',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'driven', in: 'query', schema: { type: 'string' } },
          { name: 'maxCapacity', in: 'query', schema: { type: 'integer' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['capacity-asc', 'capacity-desc'] } }
        ],
        responses: {
          200: { description: 'List of active equipment' }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        summary: 'Get single product details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product detail' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/api/parts': {
      get: {
        summary: 'List spare parts catalog with filters and search',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'condition', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['sku-asc', 'brand-asc'] } }
        ],
        responses: {
          200: { description: 'List of matching spare parts' }
        }
      }
    },
    '/api/parts/{id}': {
      get: {
        summary: 'Get single part detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Part detail' },
          404: { description: 'Part not found' }
        }
      }
    },
    '/api/inquiries': {
      post: {
        summary: 'Submit Contact / Commercial Proposal Inquiry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Inquiry' }
            }
          }
        },
        responses: {
          201: { description: 'Inquiry submitted' }
        }
      }
    },
    '/api/tickets': {
      post: {
        summary: 'Submit After-Sales Service Intake Ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ServiceTicket' }
            }
          }
        },
        responses: {
          201: { description: 'Service ticket generated (returns ticket_id format MT-xxxxxx)' }
        }
      }
    },
    '/api/tickets/{id}': {
      get: {
        summary: 'Track Service Ticket & View Time Logs',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'MT-824021' }],
        responses: {
          200: { description: 'Ticket status and timeline logs' },
          404: { description: 'Ticket not found' }
        }
      }
    },
    '/api/documents': {
      get: {
        summary: 'List Technical Library Documents & SOP Checklist PDFs',
        responses: {
          200: { description: 'Document list' }
        }
      }
    },
    '/api/admin/dashboard/stats': {
      get: {
        summary: 'Admin Dashboard Stats & Counters',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Dashboard metrics overview' }
        }
      }
    },
    '/api/admin/products': {
      post: {
        summary: 'Create New Equipment Product',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Product' } }
          }
        },
        responses: {
          201: { description: 'Product created' }
        }
      }
    },
    '/api/admin/parts': {
      post: {
        summary: 'Create New Spare Part',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Part' } }
          }
        },
        responses: {
          201: { description: 'Part created' }
        }
      }
    },
    '/api/admin/inquiries': {
      get: {
        summary: 'List All Customer Inquiries (Paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'in_review', 'responded', 'closed'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Inquiries list' }
        }
      }
    },
    '/api/admin/tickets/all': {
      get: {
        summary: 'List All Service Tickets',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Service tickets list' }
        }
      }
    }
  }
};
