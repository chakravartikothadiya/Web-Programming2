const express = require('express');
const router = express.Router();
const data = require('../data');
const userData = data.user;
const validate = require('../validations');

router
  .route('/signup')
  .post(async (req, res) => {
    //code here for POST
    let name = req.body.name;
    let username = req.body.username;
    let password = req.body.password;

    try{
        await validate.validate_name(name);
        await validate.validate_user_pass(username,password);
        let signup = await userData.createUser(name, username, password);
        res.json(signup);
    }catch(e)
    {
        if(e.statusCode)
        {
            res.status(e.statusCode).json({error:e.error});
        }
        else
        {
            res.status(500).json("Internal Server Error");
        }
    }
  });

  router
  .route('/login')
  .post(async(req,res)=>{
    let body = req.body;
    const {username, password} = body;
    try{

      if(req.session.login) throw {statusCode:400,error:"User already logged in"};

      await validate.validate_user_pass(username,password);
      let loggedUser = await userData.verifyUserPass(username,password);
      req.session.login=loggedUser;
      req.session.username = username;
      res.json("Authenticated");
    }catch(e)
    {
      if(e.statusCode)
      {
          res.status(e.statusCode).json({error:e.error});
      }
      else
      {
          res.status(500).json("Internal Server Error");
      }
    }
  });

  router
  .route('/logout')
  .get(async(req,res)=>{
    req.session.destroy();
    res.json("Logged Outtt");
  });

module.exports = router;