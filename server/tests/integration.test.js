// Integration tests

const { createAgent } = require('./setup');
const { cleanDatabase, createTestUser, createTestSpot, loginAs, pool } = require('./setup');

describe('Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  // Authentication Check (JWT)

  describe('Authentication Flow', () => {
    it('should maintain session across requests and invalidate on logout', async () => {
      await createTestUser();
      const agent = createAgent();

      // 1. Login
      const loginRes = await agent.post('/api/auth/login').send({
        email: 'test@u.nus.edu', password: 'password123',
      });
      expect(loginRes.status).toBe(200);

      // 2. Access functions for logged-in users only
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('test@u.nus.edu');

      // 3. Refresh tokens
      const refreshRes = await agent.post('/api/auth/refresh');
      expect(refreshRes.status).toBe(200);

      // 4. Still authenticated after refresh
      const meAfter = await agent.get('/api/auth/me');
      expect(meAfter.status).toBe(200);

      // 5. Logout
      await agent.post('/api/auth/logout');

      // 6. No longer authenticated
      const meFinal = await agent.get('/api/auth/me');
      expect(meFinal.status).toBe(401);
    });
  });

  // New User: Register + Feedback

  describe('Student Feedback Flow', () => {
    it('should be able to register, submit feedback, and see updated scores', async () => {
      const spot = await createTestSpot({ name: 'Central Library Level 3' });
      const agent = createAgent();

      // 1. Register
      const registerRes = await agent.post('/api/auth/register').send({
        email: 'e1234567@u.nus.edu',
        username: 'newstudent',
        password: 'password123',
      });
      expect(registerRes.status).toBe(201);
      expect(registerRes.body.user.username).toBe('newstudent');

      // 2. Browse spots
      const spotsRes = await agent.get('/api/spots');
      expect(spotsRes.status).toBe(200);
      const spotBefore = spotsRes.body.find(s => s.id === spot.id);
      expect(spotBefore).toBeDefined();

      // 3. Submit feedback
      const feedbackRes = await agent.post('/api/feedback').send({
        spotId: spot.id, noiseLevel: 4, crowdLevel: 5, comment: 'Very crowded today',
      });
      expect(feedbackRes.status).toBe(201);
      expect(feedbackRes.body.updatedScore).toBeDefined();

      // 4. Browse updated spots
      const spotsAfter = await agent.get('/api/spots');
      const spotAfter = spotsAfter.body.find(s => s.id === spot.id);
      expect(spotAfter.report_count).toBeGreaterThan(0);

      // 5. Check feedback history
      const historyRes = await agent.get('/api/profile/feedback');
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(1);
      expect(historyRes.body.data[0].comment).toBe('Very crowded today');
    });
  });

  // Favourite: User can favourite & feedback

  describe('Favourite Spot Flow', () => {
    it('should favourite a spot, submit feedback, and see it in favourites', async () => {
      const spot = await createTestSpot({ name: 'COM1 Study Area' });
      await createTestUser();
      const agent = createAgent();
      await loginAs(agent);

      // 1. Favourite the spot
      const favRes = await agent.post(`/api/spots/${spot.id}/favourite`);
      expect(favRes.status).toBe(201);

      // 2. Submit feedback for it
      await agent.post('/api/feedback').send({
        spotId: spot.id, noiseLevel: 2, crowdLevel: 1,
      });

      // 3. Check favourites (score should be updated)
      const favsRes = await agent.get('/api/spots/favourites');
      expect(favsRes.body.length).toBe(1);
      expect(favsRes.body[0].name).toBe('COM1 Study Area');
      expect(favsRes.body[0].report_count).toBeGreaterThan(0);

      // 4. Check spot details (should show as favouriteds)
      const detailRes = await agent.get(`/api/spots/${spot.id}`);
      expect(detailRes.body.is_favourited).toBe(true);
      expect(detailRes.body.recentFeedback.length).toBe(1);

      // 5. Unfavourite
      await agent.delete(`/api/spots/${spot.id}/favourite`);
      const detailAfter = await agent.get(`/api/spots/${spot.id}`);
      expect(detailAfter.body.is_favourited).toBe(false);
    });
  });

  // Search and Filter Checks

  describe('Search and Filter Flow', () => {
    it('should narrow down spots using multiple filters', async () => {
      await createTestSpot({ name: 'Quiet Library', spot_type: 'library', has_power: true, has_aircon: true, faculty: ['University'] });
      await createTestSpot({ name: 'Noisy Outdoor', spot_type: 'outdoor', has_power: false, has_aircon: false, faculty: ['Computing'] });
      await createTestSpot({ name: 'COM1 Study Room', spot_type: 'study_room', has_power: true, has_aircon: true, faculty: ['Computing'] });

      const agent = createAgent();

      // Search by text
      const searchRes = await agent.get('/api/spots?search=COM1');
      expect(searchRes.body.length).toBe(1);

      // Filter by type
      const typeRes = await agent.get('/api/spots?spotType=library');
      expect(typeRes.body.length).toBe(1);

      // Filter by amenity
      const powerRes = await agent.get('/api/spots?hasPower=true');
      expect(powerRes.body.length).toBe(2);

      // Filter by faculty
      const facRes = await agent.get('/api/spots?faculty=Computing');
      expect(facRes.body.length).toBe(2);

      // Combine: Computing + power
      const comboRes = await agent.get('/api/spots?faculty=Computing&hasPower=true');
      expect(comboRes.body.length).toBe(1);
      expect(comboRes.body[0].name).toBe('COM1 Study Room');
    });
  });

  // Profile: Password Change + Persistent Login Check
  describe('Password Change Flow', () => {
    it('should change password and invalidate old sessions', async () => {
      await createTestUser();

      // Login on device 1
      const device1 = createAgent();
      await loginAs(device1);

      // Login on device 2
      const device2 = createAgent();
      await loginAs(device2);

      // Both devices works
      const me1 = await device1.get('/api/auth/me');
      const me2 = await device2.get('/api/auth/me');
      expect(me1.status).toBe(200);
      expect(me2.status).toBe(200);

      // Change password from device 1
      const changeRes = await device1.put('/api/profile/password').send({
        currentPassword: 'password123',
        newPassword: 'newpass456',
      });
      expect(changeRes.status).toBe(200);

      // Device 2's refresh token should be revoked
      const refresh2 = await device2.post('/api/auth/refresh');
      expect(refresh2.status).toBe(401);

      // New password login works
      const device3 = createAgent();
      const loginNew = await device3.post('/api/auth/login').send({
        email: 'test@u.nus.edu', password: 'newpass456',
      });
      expect(loginNew.status).toBe(200);
    });
  });

    // Admin Functions: Create, Edit & Remove Spot Details + Feedback Moderation

  describe('Admin Flow', () => {
    it('should create spot, receive feedback, then moderate it', async () => {
      // Admin & User required
      await createTestUser('admin');
      await createTestUser('user');

      const adminAgent = createAgent();
      await loginAs(adminAgent, 'admin@u.nus.edu', 'password123');

      const userAgent = createAgent();
      await loginAs(userAgent, 'test@u.nus.edu', 'password123');

      // 1. Admin creates a new study spot
      const spotRes = await adminAgent.post('/api/admin/spots').send({
        name: 'New UTown Room', building: 'ERC', faculty: ['University'],
        spotType: 'study_room', hasPower: true, hasAircon: true,
        description: 'Fresh study room',
      });
      expect(spotRes.status).toBe(201);
      const spotId = spotRes.body.id;

      // 2. Admin able to set study spot schedule
      await adminAgent.put('/api/admin/schedules').send({
        spotId, dayOfWeek: 'weekday', openingTime: '08:00', closingTime: '22:00',
      });
      await adminAgent.put('/api/admin/schedules').send({
        spotId, dayOfWeek: 'sunday', isClosed: true,
      });

      // 3. User submits feedback
      const fbRes = await userAgent.post('/api/feedback').send({
        spotId, noiseLevel: 5, crowdLevel: 5, comment: 'Terrible spam feedback',
      });
      expect(fbRes.status).toBe(201);

      // 4. Admin notices bad feedback
      const reviewRes = await adminAgent.get(`/api/admin/feedback?spotId=${spotId}`);
      expect(reviewRes.body.data.length).toBe(1);
      expect(reviewRes.body.data[0].comment).toBe('Terrible spam feedback');

      // 5. Admin deletes the bad feedback
      const feedbackId = reviewRes.body.data[0].id;
      const deleteRes = await adminAgent.delete(`/api/admin/feedback/${feedbackId}`);
      expect(deleteRes.status).toBe(200);

      // 6. Verify feedback is gone and score recalculated
      const checkRes = await adminAgent.get(`/api/admin/feedback?spotId=${spotId}`);
      expect(checkRes.body.total).toBe(0);

      // 7. Admin able to delete spot
      const delSpotRes = await adminAgent.delete(`/api/admin/spots/${spotId}`);
      expect(delSpotRes.status).toBe(200);

      // 8. Spot should no longer exist
      const notFound = await userAgent.get(`/api/spots/${spotId}`);
      expect(notFound.status).toBe(404);
    });
  });
});