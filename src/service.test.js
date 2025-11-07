const request = require('supertest');
const app = require('./service');

describe('Service', () => {
  describe('GET /', () => {
    it('should return welcome message and version', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'welcome to JWT Pizza');
      expect(res.body).toHaveProperty('version');
    });
  });





  
  describe('GET /api/docs', () => {
    it('should return API documentation', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body).toHaveProperty('config');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
    });
  });









  describe('404 handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/unknown/endpoint');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'unknown endpoint');
    });
  });
});

