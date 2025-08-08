require('dotenv').config();

module.exports = {
  development: {
    storage: process.env.DB_STORAGE || './data/db.sqlite',
    dialect: process.env.DB_DIALECT || 'sqlite',
    logging: false
  },
  test: {
    storage: ':memory:',
    dialect: 'sqlite',
    logging: false
  },
  production: {
    storage: process.env.DB_STORAGE || '/app/data/db.sqlite',
    dialect: process.env.DB_DIALECT || 'sqlite',
    logging: false
  }
};
