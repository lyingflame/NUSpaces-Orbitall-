// Testing admin endpoints & RBAC

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, createTestSpot, loginAs, pool } = require('./setup');

describe('Admin Endpoints', () => {
  let adminAgent;
  let userAgent;

  beforeEach(async () => {
    await cleanDatabase();
    await createTestUser('admin');
    await createTestUser('user');

    adminAgent = createAgent();
    await loginAs(adminAgent, 'admin@u.nus.edu', 'password123');

    userAgent = createAgent();
    await loginAs(userAgent, 'test@u.nus.edu', 'password123');
  });


  describe('RBAC Test', () => {
    it('should allow admin to access admin endpoints', async () => {
      const res = await adminAgent.get('/api/admin/schedules');
      expect(res.status).toBe(200);
    });

    it('should reject regular user from admin endpoints', async () => {
      const res = await userAgent.get('/api/admin/schedules');
      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated access to admin endpoints', async () => {
      const agent = createAgent();
      const res = await agent.get('/api/admin/schedules');
      expect(res.status).toBe(401);
    });

    it('should reject regular user from creating a spot', async () => {
      const res = await userAgent
        .post('/api/admin/spots')
        .send({ name: 'Unauthorized Spot' });
      expect(res.status).toBe(403);
    });

    it('should reject regular user from deleting a spot', async () => {
      const spot = await createTestSpot();
      const res = await userAgent.delete(`/api/admin/spots/${spot.id}`);
      expect(res.status).toBe(403);
    });
  });

  // Study spots
  describe('Spot Functions', () => {
    it('should add a new spot', async () => {
      const res = await adminAgent
        .post('/api/admin/spots')
        .send({
          name: 'New Study Room',
          building: 'COM3',
          faculty: ['Computing'],
          spotType: 'study_room',
          hasPower: true,
          hasAircon: true,
          description: 'Test spot',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Study Room');
      expect(res.body.spot_type).toBe('study_room');

      // Check if score was created
      const score = await pool.query('SELECT * FROM spot_scores WHERE spot_id = $1', [res.body.id]);
      expect(score.rows.length).toBe(1);
    });

    it('should reject spot without name', async () => {
      const res = await adminAgent
        .post('/api/admin/spots')
        .send({ building: 'COM3' });

      expect(res.status).toBe(400);
    });

    it('should update a spot', async () => {
      const spot = await createTestSpot();

      const res = await adminAgent
        .put(`/api/admin/spots/${spot.id}`)
        .send({ description: 'Updated description', capacity: 100 });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated description');
      expect(res.body.capacity).toBe(100);
      // Unchanged fields shouldn't be overwritten by req
      expect(res.body.name).toBe('Test Spot');
    });

    it('should return 404 error for updating non-existent spot', async () => {
      const res = await adminAgent
        .put('/api/admin/spots/99999')
        .send({ description: 'Does not exist' });

      expect(res.status).toBe(404);
    });

    it('should delete a spot', async () => {
      const spot = await createTestSpot();

      // Add schedule for spot
      await pool.query(
        `INSERT INTO spot_schedules (spot_id, day_of_week, opening_time, closing_time)
         VALUES ($1, 'weekday', '09:00', '21:00')`,
        [spot.id]
      );

      const res = await adminAgent.delete(`/api/admin/spots/${spot.id}`);
      expect(res.status).toBe(200);

      // Check that schedule is also deleted
      const schedules = await pool.query('SELECT * FROM spot_schedules WHERE spot_id = $1', [spot.id]);
      expect(schedules.rows.length).toBe(0);

      // Check that score also deleted
      const scores = await pool.query('SELECT * FROM spot_scores WHERE spot_id = $1', [spot.id]);
      expect(scores.rows.length).toBe(0);
    });

    it('should return 404 error for deleting non-existent spot', async () => {
      const res = await adminAgent.delete('/api/admin/spots/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('Schedule Functions', () => {
    let spot;

    beforeEach(async () => {
      spot = await createTestSpot();
    });

    it('should list schedules', async () => {
      const res = await adminAgent.get('/api/admin/schedules');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter schedules by spotId', async () => {
      // Add schedule
      await pool.query(
        `INSERT INTO spot_schedules (spot_id, day_of_week, opening_time, closing_time)
         VALUES ($1, 'weekday', '09:00', '21:00')`,
        [spot.id]
      );

      const res = await adminAgent.get(`/api/admin/schedules?spotId=${spot.id}`);
      expect(res.body.length).toBe(1);
      expect(res.body[0].day_of_week).toBe('weekday');
    });

    it('should create a new schedule', async () => {
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({
          spotId: spot.id,
          dayOfWeek: 'weekday',
          openingTime: '08:00',
          closingTime: '22:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.opening_time).toContain('08:00');
    });

    it('should update existing schedule', async () => {
      // Create initial
      await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'weekday', openingTime: '08:00', closingTime: '22:00' });

      // Update same day
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'weekday', openingTime: '09:00', closingTime: '21:00' });

      expect(res.status).toBe(200);
      expect(res.body.opening_time).toContain('09:00');

      // Should still be one row, not two
      const count = await pool.query(
        'SELECT COUNT(*) FROM spot_schedules WHERE spot_id = $1', [spot.id]
      );
      expect(parseInt(count.rows[0].count)).toBe(1);
    });

    it('should set schedule as 24hr', async () => {
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'saturday', is24hr: true });

      expect(res.status).toBe(200);
      expect(res.body.is_24hr).toBe(true);
    });

    it('should set schedule as closed', async () => {
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'sunday', isClosed: true });

      expect(res.status).toBe(200);
      expect(res.body.is_closed).toBe(true);
    });

    it('should reject invalid day_of_week', async () => {
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'monday', openingTime: '09:00', closingTime: '21:00' });

      expect(res.status).toBe(400);
    });

    it('should reject schedule for non-existent spot', async () => {
      const res = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: 99999, dayOfWeek: 'weekday', openingTime: '09:00', closingTime: '21:00' });

      expect(res.status).toBe(404);
    });

    it('should delete a schedule', async () => {
      const createRes = await adminAgent
        .put('/api/admin/schedules')
        .send({ spotId: spot.id, dayOfWeek: 'weekday', openingTime: '09:00', closingTime: '21:00' });

      const res = await adminAgent.delete(`/api/admin/schedules/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });
  });


  describe('Override Functions', () => {
    let spot;

    beforeEach(async () => {
      spot = await createTestSpot();
    });

    it('should add an override', async () => {
      const res = await adminAgent
        .post('/api/admin/overrides')
        .send({
          spotId: spot.id,
          startDate: '2026-12-25',
          endDate: '2026-12-25',
          isClosed: true,
          reason: 'Christmas Day',
        });

      expect(res.status).toBe(201);
      expect(res.body.reason).toBe('Christmas Day');
      expect(res.body.is_closed).toBe(true);
    });

    it('should add a date range override', async () => {
      const res = await adminAgent
        .post('/api/admin/overrides')
        .send({
          spotId: spot.id,
          startDate: '2026-04-13',
          endDate: '2026-05-08',
          is24hr: true,
          reason: '24/7 during exam period',
        });

      expect(res.status).toBe(201);
    });

    it('should reject end_date before start_date', async () => {
      const res = await adminAgent
        .post('/api/admin/overrides')
        .send({
          spotId: spot.id,
          startDate: '2026-12-25',
          endDate: '2026-12-20',
          isClosed: true,
        });

      expect(res.status).toBe(400);
    });

    it('should reject override for non-existent spot', async () => {
      const res = await adminAgent
        .post('/api/admin/overrides')
        .send({
          spotId: 99999,
          startDate: '2026-12-25',
          endDate: '2026-12-25',
          isClosed: true,
        });

      expect(res.status).toBe(404);
    });

    it('should update an override partially', async () => {
      const createRes = await adminAgent
        .post('/api/admin/overrides')
        .send({
          spotId: spot.id,
          startDate: '2026-12-25',
          endDate: '2026-12-25',
          isClosed: true,
          reason: 'Christmas',
        });

      const res = await adminAgent
        .put(`/api/admin/overrides/${createRes.body.id}`)
        .send({ endDate: '2026-12-26', reason: 'Christmas + Boxing Day' });

      expect(res.status).toBe(200);
      expect(res.body.reason).toBe('Christmas + Boxing Day');
    });

    it('should list overrides', async () => {
      await adminAgent
        .post('/api/admin/overrides')
        .send({ spotId: spot.id, startDate: '2026-12-25', endDate: '2026-12-25', isClosed: true });

      const res = await adminAgent.get('/api/admin/overrides');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('should filter overrides by spotId', async () => {
      const spot2 = await createTestSpot({ name: 'Other Spot' });

      await adminAgent
        .post('/api/admin/overrides')
        .send({ spotId: spot.id, startDate: '2026-12-25', endDate: '2026-12-25', isClosed: true });
      await adminAgent
        .post('/api/admin/overrides')
        .send({ spotId: spot2.id, startDate: '2026-12-25', endDate: '2026-12-25', isClosed: true });

      const res = await adminAgent.get(`/api/admin/overrides?spotId=${spot.id}`);
      expect(res.body.length).toBe(1);
    });

    it('should delete an override', async () => {
      const createRes = await adminAgent
        .post('/api/admin/overrides')
        .send({ spotId: spot.id, startDate: '2026-12-25', endDate: '2026-12-25', isClosed: true });

      const res = await adminAgent.delete(`/api/admin/overrides/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent override', async () => {
      const res = await adminAgent.delete('/api/admin/overrides/99999');
      expect(res.status).toBe(404);
    });
  });
});
