// Study spot endpoint tests

const { createAgent } = require('./setup');
const { cleanDatabase, createTestSpot, pool } = require('./setup');

describe('Study Spots', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // List spots
  describe('GET /api/spots', () => {
    it('should return all spots', async () => {
      await createTestSpot({ name: 'Spot A' });
      await createTestSpot({ name: 'Spot B', building: 'COM2' });

      const agent = createAgent();
      const res = await agent.get('/api/spots');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should return empty array when no spots exist', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should include noise_status and opening info', async () => {
      await createTestSpot();

      const agent = createAgent();
      const res = await agent.get('/api/spots');

      expect(res.body[0]).toHaveProperty('noise_status');
      expect(res.body[0]).toHaveProperty('is_open');
      expect(res.body[0]).toHaveProperty('opening_hours');
    });

    it('should not require authentication', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots');

      expect(res.status).toBe(200);
    });
  });

  // Search test
  describe('GET /api/spots?search=', () => {
    beforeEach(async () => {
      await createTestSpot({ name: 'Central Library Level 3', building: 'Central Library', faculty: ['University'] });
      await createTestSpot({ name: 'COM1 Study Area', building: 'COM1', faculty: ['Computing'] });
      await createTestSpot({ name: 'E3 Level 6', building: 'E3', faculty: ['Design & Engineering'] });
    });

    it('should search by spot name', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?search=central');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Central Library Level 3');
    });

    it('should search by building', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?search=COM1');

      expect(res.body.length).toBe(1);
    });

    it('should search by faculty', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?search=computing');

      expect(res.body.length).toBe(1);
    });

    it('should return empty for no match', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?search=nonexistent');

      expect(res.body.length).toBe(0);
    });
  });

  // Filter tests
  describe('GET /api/spots with filters', () => {
    beforeEach(async () => {
      await createTestSpot({ name: 'Library', spot_type: 'library', has_power: true, has_aircon: true });
      await createTestSpot({ name: 'Outdoor', spot_type: 'outdoor', has_power: false, has_aircon: false });
      await createTestSpot({ name: 'Lounge', spot_type: 'lounge', has_power: true, has_aircon: true });
    });

    it('should filter by spot type', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?spotType=library');

      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Library');
    });

    it('should filter by hasPower', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?hasPower=true');

      expect(res.body.length).toBe(2);
    });

    it('should filter by hasAircon', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?hasAircon=true');

      expect(res.body.length).toBe(2);
    });

    it('should filter by building', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?building=Test Building');

      expect(res.body.length).toBe(3);
    });

    it('should filter by faculty', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?faculty=Computing');

      expect(res.body.length).toBe(3);
    });
  });

  // Location searching
  describe('GET /api/spots with lat/lng', () => {
    beforeEach(async () => {
      // COM1 area (close)
      await createTestSpot({ name: 'Near Spot', latitude: 1.2950, longitude: 103.7740 });
      // Bukit Timah (far)
      await createTestSpot({ name: 'Far Spot', latitude: 1.3187, longitude: 103.8181 });
    });

    it('should sort by distance when lat/lng provided', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?lat=1.2950&lng=103.7740');

      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('Near Spot');
      expect(res.body[0].distance_km).toBeDefined();
    });

    it('should filter by radius', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots?lat=1.2950&lng=103.7740&radius=1');

      // Radius test (1km)
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Near Spot');
    });
  });

  // Single spot
  describe('GET /api/spots/:id', () => {
    it('should return spot with details', async () => {
      const spot = await createTestSpot();

      const agent = createAgent();
      const res = await agent.get(`/api/spots/${spot.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Spot');
      expect(res.body).toHaveProperty('weekly_schedule');
      expect(res.body).toHaveProperty('recentFeedback');
    });

    it('should return 404 for non-existent spot', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/spots/99999');

      expect(res.status).toBe(404);
    });
  });

  // Spot filters
  describe('GET /api/spots/filters', () => {
    it('should return available filter values', async () => {
      await createTestSpot({ building: 'COM1', faculty: ['Computing'], spot_type: 'study_room' });
      await createTestSpot({ building: 'CLB', faculty: ['University'], spot_type: 'library' });

      const agent = createAgent();
      const res = await agent.get('/api/spots/filters');

      expect(res.status).toBe(200);
      expect(res.body.buildings).toContain('COM1');
      expect(res.body.buildings).toContain('CLB');
      expect(res.body.faculties).toContain('Computing');
      expect(res.body.types).toContain('study_room');
    });
  });

  // Score refresh (admin only)
  describe('POST /api/spots/refresh', () => {
    it('should recalculate and return all spots', async () => {
      await createTestSpot();

      adminAgent = createAgent();
      await loginAs(adminAgent, 'admin@u.nus.edu', 'password123');
      const res = await adminAgent.post('/api/spots/refresh');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
