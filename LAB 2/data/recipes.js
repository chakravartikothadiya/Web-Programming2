const mongoCollections = require('../config/mongoCollections');
const validate = require('../validations');
const recipes = mongoCollections.recipes;
const {ObjectId} = require('mongodb');

const createRecipe = async(title, ingredients, steps, cookingSkillRequired ,userInfo)=>{
    //validations here
    await validate.validate_recipe(title, ingredients, steps, cookingSkillRequired);
    cookingSkillRequired=cookingSkillRequired.toLowerCase();

    userInfo._id = ObjectId(userInfo._id);
    userInfo.username=userInfo.username.toLowerCase();
    let newRecipeObj = {
        title: title,
        ingredients: ingredients,
        cookingSkillRequired: cookingSkillRequired,
        steps:steps,
        userThatPosted: userInfo,
        comments: [],
        likes: []
    }

    const recipeCollection = await recipes();
    let insertRecipe = await recipeCollection.insertOne(newRecipeObj);
    if(!insertRecipe.acknowledged || !insertRecipe.insertedId)
    {
        throw {statusCode:500, error:"Internal Server Error"};
    }

    let getBackRecipe = await recipeCollection.findOne({_id:insertRecipe.insertedId});
    if(!getBackRecipe)
    {
        throw {statusCode:500, error:"Internal Server Error"};
    }

    getBackRecipe._id = getBackRecipe._id.toString();
    return getBackRecipe;
}

const getRecipeById = async(Id) =>{
    //Validate ID
    await validate.validate_ID(Id);
    const recipeCollection = await recipes();
    let findRecipe = await recipeCollection.findOne({_id:ObjectId(Id)});
    if(!findRecipe)
    {
        throw {statusCode:404, error:"Recipe Not Found"};
    }
    findRecipe._id = findRecipe._id.toString();
    return findRecipe;
}

const getAllRecipes = async(page) =>{
    const recipeCollection = await recipes();
    let getAllRecp;
    if(!page)
    {
        getAllRecp = await recipeCollection.find({}).limit(50).toArray();
    }
    else
    {
        page=page.trim();
        if(isNaN(page))
        {
            throw {statusCode:400,error:"Page should be a number"};
        }
        if(page==0)
        {
            throw {statusCode:400, error:"Page should start from 1 and not 0"};
        }
        if(page==1)
        {
            getAllRecp = await recipeCollection.find({}).limit(50).toArray();
        }
        else
        {
            getAllRecp = await recipeCollection.find({}).skip((page-1)*50).limit(50).toArray();
        }
    }
    if(!getAllRecp)
    {
        throw {statusCode:500, error:"Internal Sever Error"};
    }
    if(getAllRecp.length===0)
    {
        throw {statusCode:404, error:"there are no more recipes"};
    }
    for(let i=0;i<getAllRecp.length;i++)
    {
        getAllRecp[i]._id = getAllRecp[i]._id.toString();
    }
    return getAllRecp;
}

const udateRecipe = async(Id,title,ingredients,cookingSkillRequired,steps,userId) =>{
    //validations for Id and userId

    await validate.validate_ID(Id);
    await validate.validate_ID(userId);
   
    const recipeCollection = await recipes();
    const firstfetch = await recipeCollection.findOne({_id:ObjectId(Id)});
    const oldRecipe = await recipeCollection.findOne({_id:ObjectId(Id)});
    if(!firstfetch)
    {
        throw {statusCode:404, error:"The Recipe to be updated not found"};
    }
    let fetchedUserId = firstfetch.userThatPosted._id.toString();
    if(userId!==fetchedUserId)
    {
        throw {statusCode:400, error:"The Recipe can be updated only by the user who created it"};
    }

    if(!title && !ingredients && !cookingSkillRequired && !steps)
    {
        throw {statusCode:400, error:"Atleast one value should be not null"};
    }

    let atleast_one_new_flag = 0;
    //Check each one of them

    //Object to be updated
    let UpdatedRecipeObj = {};

    //1. Check title
    if(title)
    {
        await validate.validate_title(title);
        if(title!==firstfetch.title)
        {
            atleast_one_new_flag =1;
        }
        UpdatedRecipeObj.title=title;
    }

    //2. Check ingridents 
    if(ingredients)
    {
        await validate.validate_ingredients(ingredients);
        let initial_arr = firstfetch.ingredients.sort();
        let after_arr = ingredients.sort();
        let not_match_flag = 0;

        if(ingredients.length===firstfetch.ingredients.length)
        {
            for(let i=0;i<initial_arr.length;i++)
            {
                if(initial_arr[i]!==after_arr[i])
                {
                    not_match_flag = 1;
                    break;
                }
            }
            if(not_match_flag===1)
            {
                atleast_one_new_flag=1;
            }
        }
        else
        {
            atleast_one_new_flag = 1;
        } 
        UpdatedRecipeObj.ingredients=ingredients;
    }

    //3. Check CookingSkillsReq
    if(cookingSkillRequired)
    {
        await validate.validate_cookingSkillRequired(cookingSkillRequired);
        cookingSkillRequired = cookingSkillRequired.toLowerCase();
        if(cookingSkillRequired!==firstfetch.cookingSkillRequired)
        {
            atleast_one_new_flag = 1;
        }
        UpdatedRecipeObj.cookingSkillRequired=cookingSkillRequired;
    }

    //4. Check steps
    if(steps)
    {
        await validate.validate_steps(steps);
        let initial_arr = firstfetch.steps.sort();
        let after_arr = steps.sort();
        let not_match_flag = 0;

        if(steps.length===firstfetch.steps.length)
        {
            for(let i=0;i<initial_arr.length;i++)
            {
                if(initial_arr[i]!==after_arr[i])
                {
                    not_match_flag = 1;
                    break;
                }
            }
            if(not_match_flag===1)
            {
                atleast_one_new_flag=1;
            }
        }
        else
        {
            atleast_one_new_flag = 1;
        } 
        UpdatedRecipeObj.steps=steps;
    }

    if(atleast_one_new_flag===0)
    {
        throw {statusCode:400, error:"Atleat 1 value to be updated should be different then previous value"};
    }


    const updateR = await recipeCollection.updateOne({_id:ObjectId(Id)},{$set:UpdatedRecipeObj});
    if(updateR.modifiedCount === 0)
    {
        throw {statusCode:500, error:"Internal Sever Error"};
    }

    const updatedObj = await recipeCollection.findOne({_id: ObjectId(Id)});
    if(!updatedObj)
    {
        throw {statusCode:500, error:"Internal Sever Error"};
    }
    updatedObj._id =updatedObj._id.toString();
    firstfetch._id =firstfetch._id.toString();
    oldRecipe._id = oldRecipe._id.toString();
 
 return {new:updatedObj,old:oldRecipe};
}


module.exports = {
    createRecipe,
    getAllRecipes,
    getRecipeById,
    udateRecipe
}