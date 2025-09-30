const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});







test('register user', async () => {
  const newUser = { 
    name: 'test user', 
    email: Math.random().toString(36).substring(2, 12) + '@test.com', 
    password: 'password123' 
  };
  const registerRes = await request(app).post('/api/auth').send(newUser);




  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);




  expect(registerRes.body.user.name).toBe(newUser.name);
  expect(registerRes.body.user.email).toBe(newUser.email);
  expect(registerRes.body.user.roles).toEqual([{ role: 'diner' }]);
});

test('registeruser missing fields', async () => {
  const incompleteUser = { name: 'test user' };
  const registerRes = await request(app).post('/api/auth').send(incompleteUser);



  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});







test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);


  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;

  expect(loginRes.body.user).toMatchObject(expectedUser);
});
test('login with invalid credentials', async () => {
  const invalidUser = { email: 'nonexistent@test.com', password: 'wrongpassword' };

  const loginRes = await request(app).put('/api/auth').send(invalidUser);
  expect(loginRes.status).toBe(404);
});






test('logout', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});






test('logout without token', async () => {
  const logoutRes = await request(app).delete('/api/auth');
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body.message).toBe('unauthorized');
});





function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
