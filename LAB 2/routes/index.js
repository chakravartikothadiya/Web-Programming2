
const recipeRoutes = require('./recipes');
const userRoutes =require('./user');

const constructorMethod = (app) => {
    app.use('/', userRoutes);
    app.use('/recipes',recipeRoutes)
    app.use('*', (req, res) => {
      res.status(404).json('Page Not found');
    });
      
  };

module.exports = constructorMethod;