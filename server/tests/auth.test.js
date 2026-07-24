// Auth endpoint tests

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, pool } = require('./setup');

describe('Authentication', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // Register
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid NUS email', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'e1234567@u.nus.edu',
          username: 'newuser',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('e1234567@u.nus.edu');
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.role).toBe('user');
      // Tokens should be in cookies
      expect(res.body.token).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should accept @nus.edu.sg email', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'test@nus.edu.sg',
          username: 'nususer',
          password: 'password123',
        });

      expect(res.status).toBe(201);
    });

    it('should reject non-NUS email', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'test@gmail.com',
          username: 'baduser',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject weak password (less than 8 chars)', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'e1234567@u.nus.edu',
          username: 'newuser',
          password: 'short1',
        });

      expect(res.status).toBe(400);
    });

    it('should reject password without number', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'e1234567@u.nus.edu',
          username: 'newuser',
          password: 'noNumberHere',
        });

      expect(res.status).toBe(400);
    });

    it('should reject password without letter', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'e1234567@u.nus.edu',
          username: 'newuser',
          password: '12345678',
        });

      expect(res.status).toBe(400);
    });

    it('should reject short username (less than 3 chars)', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'e1234567@u.nus.edu',
          username: 'ab',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      await createTestUser();
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'test@u.nus.edu',
          username: 'different',
          password: 'password123',
        });

      expect(res.status).toBe(409);
    });

    it('should normalize email to lowercase', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/register')
        .send({
          email: 'E1234567@U.NUS.EDU',
          username: 'newuser',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('e1234567@u.nus.edu');
    });
  });

  // Login
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser();
    });

    it('should login with valid credentials', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@u.nus.edu');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'wrongpassword1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should reject non-existent email', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'noone@u.nus.edu', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const agent = createAgent();
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu' });

      expect(res.status).toBe(400);
    });
  });

  // Authentication
  describe('GET /api/auth/me', () => {
    it('should return user data when authenticated', async () => {
      await createTestUser();
      const agent = createAgent();

      // Login for cookies
      await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'password123' });

      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@u.nus.edu');
    });

    it('should reject unauthenticated request', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  // Logout
  describe('POST /api/auth/logout', () => {
    it('should clear cookies and revoke refresh token', async () => {
      await createTestUser();
      const agent = createAgent();

      // Login
      await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'password123' });

      // Logout
      const res = await agent.post('/api/auth/logout');
      expect(res.status).toBe(200);

      // Authorisation check
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });

  // Token Refresh
  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      await createTestUser();
      const agent = createAgent();

      // Login
      await agent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'password123' });

      // Refresh
      const res = await agent.post('/api/auth/refresh');
      expect(res.status).toBe(200);

      // Should still be able to access after refresh
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
    });

    it('should reject refresh without cookie', async () => {
      const agent = createAgent();
      const res = await agent.post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });
});
