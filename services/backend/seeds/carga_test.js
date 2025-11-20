exports.seed = async function(knex) {
  // Insertar usuarios (actualiza si ya existen)
  await knex('users')
    .insert([
      {
        id: 1,
        username: 'test',
        email: 'test@example.local',
        password: 'password',
        first_name: 'Test',
        last_name: 'User',
        activated: true,
        reset_password_token: null,
        reset_password_expires: null,
        invite_token: null,
        invite_token_expires: null,
        picture_path: null
      },
      {
        id: 2,
        username: 'prod',
        email: 'prod@example.local',
        password: 'password',
        first_name: 'Prod',
        last_name: 'User',
        activated: true,
        reset_password_token: null,
        reset_password_expires: null,
        invite_token: null,
        invite_token_expires: null,
        picture_path: null
      }
    ])
    .onConflict('id')  // Si el ID ya existe
    .merge();          // actualiza el registro en lugar de fallar

  // Insertar facturas (actualiza si ya existen)
  await knex('invoices')
    .insert([
      { id: 1, userId: 1, amount: 101.00, dueDate: new Date('2025-01-01'), status: 'unpaid' },
      { id: 2, userId: 1, amount: 102.00, dueDate: new Date('2025-01-01'), status: 'paid' },
      { id: 3, userId: 1, amount: 103.00, dueDate: new Date('2025-01-01'), status: 'paid' },
      { id: 4, userId: 2, amount:  99.00, dueDate: new Date('2025-01-01'), status: 'unpaid' }
    ])
    .onConflict('id')
    .merge();
};


/*
exports.seed = async function(knex) {

  await knex('users').insert({
    id: 1,
    username: 'test',
    email: 'test@example.local',
    password: 'password',
    first_name: 'Test',
    last_name: 'User',
    activated: true,
    reset_password_token: null,
    reset_password_expires: null,
    invite_token: null,
    invite_token_expires: null,
    picture_path: null
  });
  await knex('users').insert({
    id: 2,
    username: 'prod',
    email: 'prod@example.local',
    password: 'password',
    first_name: 'Prod',
    last_name: 'User',
    activated: true,
    reset_password_token: null,
    reset_password_expires: null,
    invite_token: null,
    invite_token_expires: null,
    picture_path: null
  });
  await knex('invoices').insert({
    id: 1,
    userId: 1,
    amount: 101.00,
    dueDate: new Date('2025-01-01'),
    status: 'unpaid'
   });
  await knex('invoices').insert({
    id: 2,
    userId: 1,
    amount: 102.00,
    dueDate: new Date('2025-01-01'),
    status: 'paid'
   });
  await knex('invoices').insert({
    id: 3,
    userId: 1,
    amount: 103.00,
    dueDate: new Date('2025-01-01'),
    status: 'paid'
   });
  await knex('invoices').insert({
    id: 4,
    userId: 2,
    amount: 99.00,
    dueDate: new Date('2025-01-01'),
    status: 'unpaid'
   });
};
*/