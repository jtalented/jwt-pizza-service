const request = require('supertest');
const app = require('../service');
const { DB, Role } = require('../database/database.js');

let testUser;
let testUserAuthToken;
let adminUser;
let adminAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}






async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';




  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}





beforeAll(async () => {
  //creates a test user
  testUser = { 
    name: randomName(), 
    email: randomName() + '@test.com', 
    password: 'password123' 
  };
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;




  // this one can reate admin user
  adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send({
    email: adminUser.email,
    password: adminUser.password
  });
  adminAuthToken = adminLoginRes.body.token;
});




test('get userme', async () => {
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  


  expect(res.status).toBe(200);
  expect(res.body.name).toBe(testUser.name);
  expect(res.body.email).toBe(testUser.email);
  expect(res.body.roles).toEqual([{ role: 'diner' }]);
});





test('get user without auth', async () => {
  const res = await request(app).get('/api/user/me');
  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});




test('update user', async () => {
  const updatedData = {
    name: 'Updated Name',
    email: testUser.email,
    password: 'newpassword123'
  };
  


  const res = await request(app)
    .put(`/api/user/${testUser.id}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updatedData);
  


    
  expect(res.status).toBe(403);
});











test('update user unauthorized', async () => {
  const updatedData = {
    name: 'Hacker Name',
    email: 'hacker@test.com',
    password: 'hackerpass'
  };
  
  const res = await request(app)
    .put(`/api/user/${testUser.id + 999}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updatedData);
  


  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unauthorized');
});






test('admin can update anyuser', async () => {
  const updatedData = {
    name: 'Admin Updated Name',
    email: testUser.email,
    password: 'adminupdatedpass'
  };
  


  
  const res = await request(app)
    .put(`/api/user/${testUser.id}`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(updatedData);
  
  expect(res.status).toBe(500);
});

