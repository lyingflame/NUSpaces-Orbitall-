// Test favourites system

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, createTestSpot, loginAs, pool } = require('./setup');

describe('Favourites', () => {
  let agent;
  let spot;

  beforeEach(async () => {
    await cleanDatabase();
    await createTestUser();
    spot = await createTestSpot();
    agent = createAgent();
    await loginAs(agent);
  });

  // Add favourites
  describe('POST /api/spots/:id/favourite', () => {
    it('should bookmark a spot', async () => {
      const res = await agent.post(`/api/spots/${spot.id}/favourite`);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Added');
    });

    it('should handle duplicate bookmark gracefully', async () => {
      await agent.post(`/api/spots/${spot.id}/favourite`);
      const res = await agent.post(`/api/spots/${spot.id}/favourite`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Already');
    });

    it('should reject non-existent spot', async () => {
      const res = await agent.post('/api/spots/99999/favourite');

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const unauthAgent = createAgent();
      const res = await unauthAgent.post(`/api/spots/${spot.id}/favourite`);

      expect(res.status).toBe(401);
    });
  });

  // Remove favourites
  describe('DELETE /api/spots/:id/favourite', () => {
    it('should remove a bookmark', async () => {
      await agent.post(`/api/spots/${spot.id}/favourite`);
      const res = await agent.delete(`/api/spots/${spot.id}/favourite`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for spot not in favourites', async () => {
      const res = await agent.delete(`/api/spots/${spot.id}/favourite`);

      expect(res.status).toBe(404);
    });
  });

  // List favourites
  describe('GET /api/spots/favourites', () => {
    it('should return bookmarked spots with scores', async () => {
      await agent.post(`/api/spots/${spot.id}/favourite`);

      const res = await agent.get('/api/spots/favourites');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Test Spot');
      expect(res.body[0].favourited_at).toBeDefined();
    });

    it('should return empty array when no favourites', async () => {
      const res = await agent.get('/api/spots/favourites');

      expect(res.body).toEqual([]);
    });

    it('should not include spots from other users', async () => {
      await agent.post(`/api/spots/${spot.id}/favourite`);

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 4);
      await pool.query(
        `INSERT INTO users (email, username, password_hash, role)
        VALUES ('other@u.nus.edu', 'otheruser', $1, 'user')`, [hash]
      );

      const agent2 = createAgent();
      await loginAs(agent2, 'other@u.nus.edu', 'password123');

      const res = await agent2.get('/api/spots/favourites');
      expect(res.body.length).toBe(0);
    });
  });

  // Favourite IDs
  describe('GET /api/spots/favourites/ids', () => {
    it('should return array of spot IDs', async () => {
      const spot2 = await createTestSpot({ name: 'Spot 2' });

      await agent.post(`/api/spots/${spot.id}/favourite`);
      await agent.post(`/api/spots/${spot2.id}/favourite`);

      const res = await agent.get('/api/spots/favourites/ids');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body).toContain(spot.id);
      expect(res.body).toContain(spot2.id);
    });
  });
});
