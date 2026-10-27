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
      },
      InvoiceLineItem: {
        type: 'object',
        required: ['description', 'qty', 'unit_price'],
        properties: {
          description: { type: 'string', example: 'Mandtech MT-500 Heavy Duty Compressor' },
          qty: { type: 'number', example: 1 },
          unit_price: { type: 'number', example: 12450 }
        }
      },
      Invoice: {
        type: 'object',
        required: ['company', 'contact_name', 'email', 'line_items'],
        properties: {
          company: { type: 'string', example: 'Apex Manufacturing Ltd.' },
          contact_name: { type: 'string', example: 'Sarah Jenkins' },
          email: { type: 'string', example: 's.jenkins@apex-mfg.com' },
          billing_address: { type: 'string', example: '44 Industrial Parkway, North Wing' },
          line_items: {
            type: 'array',
            items: { $ref: '#/components/schemas/InvoiceLineItem' }
          },
          discount_pct: { type: 'number', example: 5 },
          vat_rate_pct: { type: 'number', example: 7.5 },
          delivery_terms: { type: 'string', example: 'EXW - Ex Works' },
          currency: { type: 'string', example: 'NGN' },
          notes: { type: 'string', example: 'Net 30 days payment terms.' },
          status: { type: 'string', enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' }
        }
      },
      Project: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Quarterly Fleet Maintenance' },
          description: { type: 'string', example: 'Scheduled maintenance for Sector 4 compressors' },
          status: { type: 'string', enum: ['active', 'completed', 'on_hold', 'cancelled'], default: 'active' }
        }
      },
      User: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['admin', 'staff'] },
        created_at: { type: 'string', format: 'date-time' }
      }
    },
    Document: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        file_url: { type: 'string' },
        file_size: { type: 'string' },
        read_duration: { type: 'string' },
        icon_emoji: { type: 'string' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' }
      }
    },
    Task: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Inventory Audit - Sector 4' },
          description: { type: 'string', example: 'Audit air compressor spares' },
          status: { type: 'string', enum: ['backlog', 'in_progress', 'review', 'done'], default: 'backlog' },
          assigned_to: { type: 'string', format: 'uuid', nullable: true },
          assigned_name: { type: 'string', nullable: true, example: 'Alex Rivera' },
          due_date: { type: 'string', format: 'date', nullable: true, example: '2026-08-15' }
        }
      }
    }
  },
  paths: {
    '/api/compressor-requests': {
      post: {
        tags: ['Compressor Requests'],
        summary: 'Submit formal quotation request for an air compressor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['compressor_type', 'brand', 'company_name', 'email', 'phone'],
                properties: {
                  compressor_type: { type: 'string', enum: ['ELECTRIC AIR COMPRESSOR', 'DIESEL AIR COMPRESSOR'] },
                  brand: { type: 'string', enum: ['ATLAS COPCO', 'SULLAIR', 'INGERSOLL RAND', 'DENAIR'] },
                  company_name: { type: 'string', example: 'Dangote Industries' },
                  email: { type: 'string', example: 'procurement@dangote.com' },
                  phone: { type: 'string', example: '+234 803 123 4567' },
                  notes: { type: 'string', example: 'Looking for 300 CFM rotary screw model' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Quotation request submitted successfully' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/api/admin/compressor-requests': {
      get: {
        tags: ['Admin - Compressor Requests'],
        summary: 'List compressor quotation requests with filtering & search',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'compressor_type', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Paginated list of compressor requests' }
        }
      }
    },
    '/api/admin/compressor-requests/stats': {
      get: {
        tags: ['Admin - Compressor Requests'],
        summary: 'Get aggregation metrics and breakdown for compressor requests',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Compressor requests summary statistics' }
        }
      }
    },
    '/api/admin/compressor-requests/{id}/status': {
      patch: {
        tags: ['Admin - Compressor Requests'],
        summary: 'Update quotation request workflow status',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['new', 'contacted', 'quoted', 'closed'] },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Status updated' }
        }
      }
    },
    '/api/admin/compressor-requests/{id}': {
      delete: {
        tags: ['Admin - Compressor Requests'],
        summary: 'Delete a compressor quotation request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Request deleted' }
        }
      }
    },
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
        summary: 'Staff & Admin Login',
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
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/create-admin': {
      post: {
        summary: 'Register New Admin/Staff User',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'engineer@mandtech.com.ng' },
                  password: { type: 'string', example: 'securePassword123' },
                  role: { type: 'string', enum: ['admin', 'staff'], default: 'staff' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Admin user created successfully' },
          400: { description: 'Validation error or email exists' }
        }
      }
    },
    '/api/products': {
      get: {
        summary: 'Browse Equipment Catalog',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'driven_type', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } }
        ],
        responses: {
          200: { description: 'Filtered list of products' }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        summary: 'Get Product Detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/api/parts': {
      get: {
        summary: 'Browse Spare Parts Catalog',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'condition', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } }
        ],
        responses: {
          200: { description: 'Filtered list of parts' }
        }
      }
    },
    '/api/inquiries': {
      post: {
        summary: 'Submit RFQ / Inquiry Form',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Inquiry' } }
          }
        },
        responses: {
          201: { description: 'Inquiry received' }
        }
      }
    },
    '/api/tickets': {
      post: {
        summary: 'Submit Service Ticket Intake',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ServiceTicket' } }
          }
        },
        responses: {
          201: { description: 'Service ticket generated' }
        }
      }
    },
    '/api/tickets/{id}': {
      get: {
        summary: 'Track Service Ticket Status & Logs',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket status and timeline logs' },
          404: { description: 'Ticket not found' }
        }
      }
    },
    '/api/documents': {
      get: {
        summary: 'List Technical Library Documents',
        responses: {
          200: { description: 'Active technical documents' }
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
    '/api/admin/inquiries/stats': {
      get: {
        summary: 'Get Inquiries Aggregated Stats and Counts by Equipment Class',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Inquiry statistics and breakdowns' }
        }
      }
    },
    '/api/admin/inquiries': {
      get: {
        summary: 'List All Customer Inquiries (Paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'in_review', 'responded', 'closed'] } },
          { name: 'equipment_class', in: 'query', schema: { type: 'string' }, description: 'Filter by equipment class (New Equipment Purchase, Equipment Rental, Spare Parts, Service Request)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search name, company, email, or message' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Inquiries list' }
        }
      }
    },
    '/api/admin/inquiries/{id}/assign': {
      put: {
        summary: 'Assign / Claim Inquiry Lead',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user_id: { type: 'string', format: 'uuid', nullable: true, description: 'User ID to assign or null to unassign' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Inquiry assigned' }
        }
      }
    },
    '/api/admin/invoices': {
      get: {
        summary: 'List All Invoices / Quotations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'sent', 'paid', 'cancelled'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Invoices list' }
        }
      },
      post: {
        summary: 'Create New Invoice / Quotation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Invoice' } }
          }
        },
        responses: {
          201: { description: 'Invoice created' }
        }
      }
    },
    '/api/admin/invoices/{id}': {
      get: {
        summary: 'Get Invoice Details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invoice detail' }
        }
      },
      put: {
        summary: 'Update Invoice',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Invoice' } }
          }
        },
        responses: {
          200: { description: 'Invoice updated' }
        }
      },
      delete: {
        summary: 'Cancel Invoice',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invoice cancelled' }
        }
      }
    },
    '/api/admin/invoices/{id}/status': {
      put: {
        summary: 'Update Invoice Status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['draft', 'sent', 'paid', 'cancelled'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Status updated' }
        }
      }
    },
    '/api/admin/projects': {
      get: {
        summary: 'List All Projects with Task Counters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'completed', 'on_hold', 'cancelled'] } }
        ],
        responses: {
          200: { description: 'Projects list' }
        }
      },
      post: {
        summary: 'Create Project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Project' } }
          }
        },
        responses: {
          201: { description: 'Project created' }
        }
      }
    },
    '/api/admin/projects/{id}': {
      get: {
        summary: 'Get Project Details & Tasks',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Project detail with tasks' }
        }
      },
      put: {
        summary: 'Update Project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Project' } }
          }
        },
        responses: {
          200: { description: 'Project updated' }
        }
      },
      delete: {
        summary: 'Cancel Project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Project cancelled' }
        }
      }
    },
    '/api/admin/projects/{id}/tasks': {
      get: {
        summary: 'List Tasks for a Project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tasks list' }
        }
      },
      post: {
        summary: 'Create Task in Project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Task' } }
          }
        },
        responses: {
          201: { description: 'Task created' }
        }
      }
    },
    '/api/admin/tasks/{taskId}': {
      put: {
        summary: 'Update Task',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Task' } }
          }
        },
        responses: {
          200: { description: 'Task updated' }
        }
      },
      delete: {
        summary: 'Delete Task',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Task deleted' }
        }
      }
    },
    '/api/admin/tasks/all': {
      get: {
        summary: 'List All Tasks (Flat View)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['backlog', 'in_progress', 'review', 'done'] } },
          { name: 'assigned_to', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'All tasks list' }
        }
      }
    },
    '/api/admin/users': {
      get: {
        summary: 'List All Admin/Staff Users',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of users' } }
      },
      post: {
        summary: 'Create New Admin/Staff User (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['admin', 'staff'], default: 'staff' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'User created' } }
      }
    },
    '/api/admin/users/{id}': {
      put: {
        summary: 'Update User Role / Password (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['admin', 'staff'] },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'User updated' } }
      },
      delete: {
        summary: 'Delete User (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User deleted' } }
      }
    },
    '/api/admin/inquiries/{id}': {
      get: {
        summary: 'Get Inquiry Details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inquiry details' } }
      },
      delete: {
        summary: 'Delete Inquiry',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inquiry deleted' } }
      }
    },
    '/api/admin/tickets/{id}': {
      get: {
        summary: 'Get Service Ticket Details & Logs',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket details with logs' } }
      },
      put: {
        summary: 'Update Service Ticket Status / Engineer / ETA',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['received', 'assigned', 'in_dispatch', 'completed', 'cancelled'] },
                  assigned_engineer: { type: 'string' },
                  eta: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Ticket updated' } }
      },
      delete: {
        summary: 'Delete Service Ticket',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ticket deleted' } }
      }
    },
    '/api/admin/tickets/{id}/logs': {
      post: {
        summary: 'Add Dispatch Log Entry to Ticket',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['log_text'],
                properties: {
                  time_label: { type: 'string' },
                  log_text: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Log entry added' } }
      }
    },
    '/api/admin/documents': {
      get: {
        summary: 'List All Documents (Including Inactive)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of documents' } }
      },
      post: {
        summary: 'Create New Document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Document' } }
          }
        },
        responses: { 201: { description: 'Document created' } }
      }
    },
    '/api/admin/documents/{id}': {
      get: {
        summary: 'Get Document Details by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Document details' } }
      },
      put: {
        summary: 'Update Document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Document' } }
          }
        },
        responses: { 200: { description: 'Document updated' } }
      },
      delete: {
        summary: 'Deactivate / Soft-Delete Document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Document deactivated' } }
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
