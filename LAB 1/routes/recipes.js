const {ObjectId} = require('mongodb');
const express = require('express');
const router = express.Router();
const data = require('../data');
const recipeData = data.recipe;
const commentData = data.comment;
const validate = require('../validations');

router
.route('/')
.get(async (req,res)=>{
    try{
        let page=req.query.page;
        const getALLRec = await recipeData.getAllRecipes(page);
        res.json(getALLRec);
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
})
.post(async(req,res)=>{
    try{
      const {title, ingredients, steps, cookingSkillRequired} = req.body;
      let userinfo = {_id:req.session.login._id,username:req.session.username};

      //validate
      await validate.validate_recipe(title, ingredients, steps, cookingSkillRequired);

      const createRep = await recipeData.createRecipe(title, ingredients, steps, cookingSkillRequired,userinfo);
      res.json(createRep);
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

})

router
.route('/:id')
.get(async(req,res)=>{
try
{
    let Id=req.params.id;
    //validate ID
    await validate.validate_ID(Id);
    const getRecipe = await recipeData.getRecipeById(Id);
    res.json(getRecipe);
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
})
.patch(async(req,res)=>{
try{
    let id = req.params.id;
    let userId = req.session.login._id;
    let {title,ingredients,cookingSkillRequired,steps} = req.body;
    //client side validations
    await validate.validate_ID(id);
    await validate.validate_ID(userId);
    if(title) await validate.validate_title(title);
    if(ingredients) await validate.validate_ingredients(ingredients);
    if(steps) await validate.validate_steps(steps);
    if(cookingSkillRequired) await validate.validate_cookingSkillRequired(cookingSkillRequired);
    
    let updatedRecipe = await recipeData.udateRecipe(id,title,ingredients,cookingSkillRequired,steps,userId);
    res.json(updatedRecipe);
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
.route('/:id/comments')
.post(async(req,res)=>{
    let recipeId = req.params.id;
    try
    {
        let userInfo = {
            _id:req.session.login._id,
            username:req.session.login.username
        }
        await validate.validate_ID(recipeId);
        await validate.validate_ID(userInfo._id);

        let {comment} = req.body;

        //Validate comments 
        if(!comment || typeof(comment)!=='string' || comment.trim().length===0)
        {
          throw {statusCode:400,error:"Invalid Values for comment"};
        }
        comment = comment.trim();

        let addCom = await commentData.addComments(recipeId,userInfo,comment);
        res.json(addCom);
    }
    catch(e)
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
})

router
.route('/:id/likes')
.post(async(req,res)=>{
    try{
        let userId = req.session.login._id;
        let recipeId = req.params.id;
        await validate.validate_ID(recipeId);
        let like_unlike = await commentData.LikeUnlike(recipeId,userId);
        res.json(like_unlike);
        
    }
    catch(e)
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
.route('/:recipeId/:commentId')
.delete(async(req,res)=>{
    try
    {
        let recipeId = req.params.recipeId;
        let commentId = req.params.commentId;

        //validate 
        await validate.validate_ID(recipeId);
        await validate.validate_ID(commentId);

        let userId = req.session.login._id;
        let deleteCom = await commentData.RemoveComment(recipeId,commentId,userId)
        res.json(deleteCom);
        
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

module.exports = router;