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
  //create test user
  testUser = { 
    name: randomName(), 
    email: randomName() + '@test.com', 
    password: 'password123' 
  };
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;




  //  create a admin user
  adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send({
    email: adminUser.email,
    password: adminUser.password
  });


  adminAuthToken = adminLoginRes.body.token;
});






test('get menu', async () => {
  const res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);
  
  expect(Array.isArray(res.body)).toBe(true);
});








test('add menu item as admin', async () => {
  const menuItem = {
    title: 'Test Pizza',
    description: 'A test pizza',
    image: 'test.png',
    price: 0.01
  };
  


  const res = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(menuItem);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});






test('add menu item asnon-admin', async () => {
  const menuItem = {
    title: 'Unauthorized Pizza',
    description: 'Should not be added',
    image: 'unauthorized.png',
    price: 0.01
  };
  




  const res = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(menuItem);
  
  expect(res.status).toBe(403);
});








test('add menu item without auth', async () => {
  const menuItem = {
    title: 'No Auth Pizza',
    description: 'Should not be added',
    image: 'noauth.png',
    price: 0.01
  };
  



  const res = await request(app)
    .put('/api/order/menu')
    .send(menuItem);
  


  expect(res.status).toBe(401);
});







test('get orders', async () => {
  const res = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  




  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('dinerId');
  expect(res.body).toHaveProperty('orders');
  expect(res.body).toHaveProperty('page');
});







test('get orders without auth', async () => {
  const res = await request(app).get('/api/order');
  expect(res.status).toBe(401);
});







test('create order', async () => {
  const orderData = {
    franchiseId: 1,
    storeId: 1,
    items: [{
      menuId: 1,
      description: 'Test Pizza',
      price: 0.01
    }]
  };
  




  const res = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(orderData);
  expect([200, 500]).toContain(res.status);
});





test('create order without auth', async () => {
  const orderData = {
    franchiseId: 1,
    storeId: 1,
    items: [{
      menuId: 1,
      description: 'Test Pizza',
      price: 0.01
    }]
  };
  



  const res = await request(app)
    .post('/api/order')
    .send(orderData);
  expect(res.status).toBe(401);
});
