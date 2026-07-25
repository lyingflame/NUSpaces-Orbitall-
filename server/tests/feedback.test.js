// Test feedback endpoints

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, createTestSpot, loginAs, pool } = require('./setup');

describe('Feedback', () => {
  let agent;
  let spot;

  beforeEach(async () => {
    await cleanDatabase();
    await createTestUser();
    spot = await createTestSpot();
    agent = createAgent();
    await loginAs(agent);
  });

  // Submit feedback
  describe('POST /api/feedback', () => {
    it('should submit valid feedback', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 4, comment: 'Moderate noise' });

      expect(res.status).toBe(201);
      expect(res.body.feedback).toBeDefined();
      expect(res.body.feedback.noise_level).toBe(3);
      expect(res.body.feedback.crowd_level).toBe(4);
      expect(res.body.updatedScore).toBeDefined();
    });

    it('should submit feedback without a comment', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 1, crowdLevel: 1 });

      expect(res.status).toBe(201);
    });

    it('should reject feedback when not logged in', async () => {
      const unauthAgent = createAgent();
      const res = await unauthAgent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 3 });

      expect(res.status).toBe(401);
    });

    it('should reject noise level outside 1-5', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 6, crowdLevel: 3 });

      expect(res.status).toBe(400);
    });

    it('should reject crowd level outside 1-5', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 0 });

      expect(res.status).toBe(400);
    });

    it('should reject non-integer noise level', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 2.5, crowdLevel: 3 });

      expect(res.status).toBe(400);
    });

    it('should reject missing spotId', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ noiseLevel: 3, crowdLevel: 3 });

      expect(res.status).toBe(400);
    });

    it('should reject feedback for non-existent spot', async () => {
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: 99999, noiseLevel: 3, crowdLevel: 3 });

      expect(res.status).toBe(404);
    });

    // Test cooldown function
    it('should enforce 30-minute cooldown per user per spot', async () => {
      // First submission
      const res1 = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 3 });
      expect(res1.status).toBe(201);

      // Second spam submission should be rejected
      const res2 = await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 2, crowdLevel: 2 });
      expect(res2.status).toBe(429);
    });

    it('should allow feedback for a different spot during cooldown', async () => {
      const spot2 = await createTestSpot({ name: 'Spot 2', building: 'COM2' });

      // Submit for spot 1
      await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 3 });

      // Submit for spot 2 — unaffected by cooldown
      const res = await agent
        .post('/api/feedback')
        .send({ spotId: spot2.id, noiseLevel: 2, crowdLevel: 2 });
      expect(res.status).toBe(201);
    });

    it('should trigger score recalculation after submission', async () => {
      await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 5, crowdLevel: 5 });

      // Check that score was updated
      const scoreRes = await pool.query(
        'SELECT * FROM spot_scores WHERE spot_id = $1', [spot.id]
      );
      expect(scoreRes.rows[0].report_count).toBeGreaterThan(0);
    });
  });

  // Check feedback (will update with feedback history later)
  describe('GET /api/feedback/mine', () => {
    it('should return feedback submitted by the logged-in user', async () => {
      // Submit feedback
      await agent
        .post('/api/feedback')
        .send({ spotId: spot.id, noiseLevel: 3, crowdLevel: 3, comment: 'Test' });

      const res = await agent.get('/api/feedback/mine');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].spot_name).toBeDefined();
    });

    it('should return empty array for user with no feedback', async () => {
      const res = await agent.get('/api/feedback/mine');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should reject unauthenticated request', async () => {
      const unauthAgent = createAgent();
      const res = await unauthAgent.get('/api/feedback/mine');

      expect(res.status).toBe(401);
    });
  });
});
