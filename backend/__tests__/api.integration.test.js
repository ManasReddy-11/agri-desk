import request from 'supertest';

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  ({ default: app } = await import('../server.js'));
});

describe('API integration smoke tests', () => {
  test('GET /api/health returns success payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Server is running');
  });

  test('unknown route returns 404 with path', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
    expect(response.body.path).toBe('/api/does-not-exist');
  });

  test('POST /api/auth/login validates request body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation Error');
  });
  
  it('protects mounted admin dashboard route', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
