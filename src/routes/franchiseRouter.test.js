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
  let user = { password: 'manysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';




  user = await DB.addUser(user);
  return { ...user, password: 'manysecrets' };
}






beforeAll(async () => {
  // Create test user
  testUser = { 
    name: randomName(), 
    email: randomName() + '@test.com', 
    password: 'password123' 
  };
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;



  //create admin user
  adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send({
    email: adminUser.email,
    password: adminUser.password
  });
  adminAuthToken = adminLoginRes.body.token;
});








test('get franchises', async () => {
  const res = await request(app).get('/api/franchise');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('franchises');
  expect(res.body).toHaveProperty('more');
  expect(Array.isArray(res.body.franchises)).toBe(true);
});






test('get franchises with query params', async () => {
  const res = await request(app)
    .get('/api/franchise')
    .query({ page: 0, limit: 10, name: 'test' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('franchises');
  expect(res.body).toHaveProperty('more');
});






test('get user franchises', async () => {
  const res = await request(app)
    .get(`/api/franchise/${testUser.id}`)

    .set('Authorization', `Bearer ${testUserAuthToken}`);
  



  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});





test('get user franchises without auth', async () => {
  const res = await request(app).get(`/api/franchise/${testUser.id}`);
  expect(res.status).toBe(401);
});




test('getother user franchises as non-admin', async () => {
  const otherUser = { 
    name: randomName(), 
    email: randomName() + '@test.com', 
    password: 'password123' 
  };
  const registerRes = await request(app).post('/api/auth').send(otherUser);
  const otherUserId = registerRes.body.user.id;
  


  const res = await request(app)
    .get(`/api/franchise/${otherUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  


  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});







test('create franchise as admin', async () => {
  const franchiseData = {
    name: 'Test Franchise ' + randomName(),
    admins: [{
      email: testUser.email
    }]
  };
  


  const res = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchiseData);
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('name', franchiseData.name);
});





test('create franchise as non-admin', async () => {
  const franchiseData = {
    name: 'Unauthorized Franchise',
    admins: [{
      email: testUser.email
    }]
  };
  



  const res = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(franchiseData);
  
  expect(res.status).toBe(403);
});







test('create franchise without auth', async () => {
  const franchiseData = {
    name: 'No Auth Franchise',
    admins: [{
      email: testUser.email
    }]
  };
  




  const res = await request(app)
    .post('/api/franchise')
    .send(franchiseData);
  
  expect(res.status).toBe(401);
});







test('delete franchise', async () => {
  //reate a franchise
  const franchiseData = {
    name: 'Delete Test Franchise',
    admins: [{
      email: testUser.email
    }]
  };
  

  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchiseData);
  
  const franchiseId = createRes.body.id;
  
  const res = await request(app).delete(`/api/franchise/${franchiseId}`);
  expect(res.status).toBe(200);
  expect(res.body.message).toBe('franchise deleted');
});














test('create store as admin', async () => {
  //reate a franchise
  const franchiseData = {
    name: 'Store Test Franchise ' + randomName(),
    admins: [{
      email: testUser.email
    }]
  };
  





  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchiseData);
  
  const franchiseId = createRes.body.id;
  


  
  const storeData = {
    name: 'Test Store'
  };
  
  const res = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(storeData);
  



    
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Test Store');
});









test('create store without auth', async () => {
  const storeData = {
    name: 'No Auth Store'
  };
  
  const res = await request(app)
    .post('/api/franchise/1/store')
    .send(storeData);
  
  expect(res.status).toBe(401);
});






test('delete store as admin', async () => {
  // First create a franchise and store
  const franchiseData = {
    name: 'Delete Store Test Franchise',
    admins: [{
      email: testUser.email
    }]
  };
  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchiseData);
  


  const franchiseId = createRes.body.id;
  
  const storeData = {
    name: 'Delete Test Store'
  };
  




  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(storeData);
  
  const storeId = storeRes.body.id;
  


  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  



  expect(res.status).toBe(200);
  expect(res.body.message).toBe('store deleted');
});








test('delete store as admin', async () => {
  //ccreate a franchise and store
  const franchiseData = {
    name: 'Delete Store Test Franchise ' + randomName(),
    admins: [{
      email: testUser.email
    }]
  };
  



  const createRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(franchiseData);
  const franchiseId = createRes.body.id;
  





  const storeData = {
    name: 'Delete Test Store'
  };
  






  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(storeData);
  
  const storeId = storeRes.body.id;
  
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  







  expect(res.status).toBe(200);
  expect(res.body.message).toBe('store deleted');
});











test('delete store without auth', async () => {
  const res = await request(app).delete('/api/franchise/1/store/1');
  expect(res.status).toBe(401);
});
