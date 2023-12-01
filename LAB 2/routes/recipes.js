const {ObjectId} = require('mongodb');
const express = require('express');
const router = express.Router();
const data = require('../data');
const recipeData = data.recipe;
const commentData = data.comment;
const validate = require('../validations');
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {});


router
.route('/')
.get(async (req,res)=>{
    try{
        let page=req.query.page;
        const getALLRec = await recipeData.getAllRecipes(page);
        //Set in cashe
        if(!page)
        {
          page=1;
        }
        await client.set(`page:${page}`,JSON.stringify(getALLRec));
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

      await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(createRep)});
      await client.set(`recipie_ID:${createRep._id}`,JSON.stringify(createRep));

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
  
    //Add in the sorted list for the first time with 1 frequency;

    //await client.ZADD("RECIPES",1,JSON.stringify(getRecipe));
    await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(getRecipe)});
    await client.set(`recipie_ID:${Id}`,JSON.stringify(getRecipe));
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
    let oldRecipe = updatedRecipe.old;
    let newUpdatedRecipe = updatedRecipe.new;

    //first delete the original data if present 
    let exsist = await client.exists(`recipie_ID:${newUpdatedRecipe._id}`);
    if(exsist)
    {
      await client.del(`recipie_ID:${newUpdatedRecipe._id}`);
    } 
    await client.set(`recipie_ID:${newUpdatedRecipe._id}`,JSON.stringify(newUpdatedRecipe));
    let list_exist = await client.zScore('RECEPIES',JSON.stringify(oldRecipe));
  
    let score;
    if(list_exist!==null)
    {
      score = await client.zScore('RECEPIES',JSON.stringify(oldRecipe));
      await client.zRem('RECEPIES',JSON.stringify(oldRecipe));
    }
    if(score)
    {
      await client.zAdd('RECEPIES',{ score: ++score, value: JSON.stringify(newUpdatedRecipe)});
    }
    else
    {
      await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(newUpdatedRecipe)});
    }
    

    res.json(newUpdatedRecipe);
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
        let oldCom = addCom.old;
        let newCom = addCom.new;

        //first delete the original data if present 
        let exsist = await client.exists(`recipie_ID:${oldCom._id}`);
        if(exsist)
        {
          await client.del(`recipie_ID:${oldCom._id}`);
        } 

        await client.set(`recipie_ID:${newCom._id}`,JSON.stringify(newCom));
        let list_exist = await client.zRank('RECEPIES',JSON.stringify(oldCom));
        let score;
        if(list_exist!==null)
        {
          score = await client.zScore('RECEPIES',JSON.stringify(oldCom));
          await client.zRem('RECEPIES',JSON.stringify(oldCom));
        }

        if(score)
        {
          await client.zAdd('RECEPIES',{ score: ++score, value: JSON.stringify(newCom)});  
        }
        else
        {
          await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(newCom)});  
        }

        res.json(newCom);
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
        let newlu = like_unlike.new;
        let oldlu = like_unlike.old;

         //first delete the original data if present 
         let exsist = await client.exists(`recipie_ID:${oldlu._id}`);
         if(exsist)
         {
           await client.del(`recipie_ID:${oldlu._id}`);
         } 
         await client.set(`recipie_ID:${newlu._id}`,JSON.stringify(newlu));
         let list_exist = await client.zRank('RECEPIES',JSON.stringify(oldlu));
         let score;
         if(list_exist!==null)
         {
           score = await client.zScore('RECEPIES',JSON.stringify(oldlu));
           await client.zRem('RECEPIES',JSON.stringify(oldlu));
         }
 
         if(score)
         {
           await client.zAdd('RECEPIES',{ score: ++score, value: JSON.stringify(newlu)});  
         }
         else
         {
           await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(newlu)});   
         }

        res.json(newlu);
        
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
    
        let deleteCom = await commentData.RemoveComment(recipeId,commentId,userId);
        let oldDel = deleteCom.old;
        let newDel = deleteCom.new;

        //first delete the original data if present 
        let exsist = await client.exists(`recipie_ID:${oldDel._id}`);
        if(exsist)
        {
          await client.del(`recipie_ID:${oldDel._id}`);
        } 
        await client.set(`recipie_ID:${newDel._id}`,JSON.stringify(newDel));
        let list_exist = await client.zRank('RECEPIES',JSON.stringify(oldDel));
        let score;
        if(list_exist!==null)
        {
          score = await client.zScore('RECEPIES',JSON.stringify(oldDel));
          await client.zRem('RECEPIES',JSON.stringify(oldDel));
        }

        if(score)
        {
          await client.zAdd('RECEPIES',{ score: ++score, value: JSON.stringify(newDel)});
        }
        else
        {
          await client.zAdd('RECEPIES',{ score: 1, value: JSON.stringify(newDel)});  
        }       
        res.json(newDel);
        
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