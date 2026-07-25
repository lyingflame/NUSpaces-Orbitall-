// Test user profile functions

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, createTestSpot, loginAs, pool } = require('./setup');

describe('Profile Management', () => {
  let agent;

  beforeEach(async () => {
    await cleanDatabase();
    await createTestUser();
    agent = createAgent();
    await loginAs(agent);
  });

  // Change password
  describe('PUT /api/profile/password', () => {
    it('should change password with correct current password', async () => {
      const res = await agent
        .put('/api/profile/password')
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.status).toBe(200);

      // Old password should no longer work
      const newAgent = createAgent();
      const loginRes = await newAgent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'password123' });
      expect(loginRes.status).toBe(401);

      // New password should work
      const loginRes2 = await newAgent
        .post('/api/auth/login')
        .send({ email: 'test@u.nus.edu', password: 'newpass456' });
      expect(loginRes2.status).toBe(200);
    });

    it('should reject wrong current password', async () => {
      const res = await agent
        .put('/api/profile/password')
        .send({ currentPassword: 'wrongpassword1', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });

    it('should reject weak new password', async () => {
      const res = await agent
        .put('/api/profile/password')
        .send({ currentPassword: 'password123', newPassword: 'short' });

      expect(res.status).toBe(400);
    });

    it('should revoke all refresh tokens after password change', async () => {
      await agent
        .put('/api/profile/password')
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      const tokens = await pool.query(
        "SELECT * FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'test@u.nus.edu')"
      );
      expect(tokens.rows.length).toBe(0);
    });

    it('should require authentication', async () => {
      const unauthAgent = createAgent();
      const res = await unauthAgent
        .put('/api/profile/password')
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });
  });

  // Update username
  describe('PUT /api/profile/username', () => {
    it('should update username', async () => {
      const res = await agent
        .put('/api/profile/username')
        .send({ username: 'newusername' });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('newusername');
    });

    it('should reject duplicate username', async () => {
      // Create another user
      await pool.query(
        `INSERT INTO users (email, username, password_hash, role)
         VALUES ('other@u.nus.edu', 'takenname', '$2b$04$test', 'user')`
      );

      const res = await agent
        .put('/api/profile/username')
        .send({ username: 'takenname' });

      expect(res.status).toBe(409);
    });

    it('should reject short username', async () => {
      const res = await agent
        .put('/api/profile/username')
        .send({ username: 'ab' });

      expect(res.status).toBe(400);
    });

    it('should reject username with special characters', async () => {
      const res = await agent
        .put('/api/profile/username')
        .send({ username: 'bad@name!' });

      expect(res.status).toBe(400);
    });
  });

  // Feedback history
  describe('GET /api/profile/feedback', () => {
    it('should return paginated feedback history', async () => {
      const spot = await createTestSpot();

      await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 4, comment: 'Test feedback' });

      const res = await agent.get('/api/profile/feedback');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].spot_name).toBeDefined();
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
    });

    it('should return empty for user with no feedback', async () => {
      const res = await agent.get('/api/profile/feedback');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should support pagination', async () => {
      const spot = await createTestSpot();
      const spot2 = await createTestSpot({ name: 'Spot 2' });

      await agent.post('/api/feedback').send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 3 });
      await agent.post('/api/feedback').send({ spotId: spot2.id, noiseLevel: 2, crowdLevel: 2 });

      const res = await agent.get('/api/profile/feedback?page=1&limit=1');

      expect(res.body.data.length).toBe(1);
      expect(res.body.total).toBe(2);
      expect(res.body.totalPages).toBe(2);
    });

    it('should require authentication', async () => {
      const unauthAgent = createAgent();
      const res = await unauthAgent.get('/api/profile/feedback');

      expect(res.status).toBe(401);
    });
  });
});
