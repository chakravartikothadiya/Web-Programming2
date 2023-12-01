const mongoCollections = require('../config/mongoCollections');
const recipes = mongoCollections.recipes;
const validate = require('../validations');
const {ObjectId} = require('mongodb');


const addComments = async (recipeId,userInfo,comment)=>{

    //validations here
    await validate.validate_ID(recipeId);
    await validate.validate_ID(userInfo._id);

    //Validate comments 
    if(!comment || typeof(comment)!=='string' || comment.trim().length===0)
    {
        throw {statusCode:400,error:"Invalid Values for comment"};
    }
    comment = comment.trim();

    // Adding code starts form here
    const recipeCollection = await recipes();
    let fetchRecipe = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchRecipe)
    {
        throw {statusCode:404,error:"Recipe not found for the given recipe ID"};
    }
    
    userInfo._id = ObjectId(userInfo._id);
    let commentObj = {
        _id:new ObjectId(),
        userThatPostedComment: userInfo,
        comment:comment
    }

    const addCommet = await recipeCollection.updateOne({_id:ObjectId(recipeId)},{$push: {comments: commentObj}});
    if(addCommet.modifiedCount===0)
    {
        throw {statusCode:500,error:"Internal Server Error"};
    }
    
    const fetchagain = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchagain)
    {
        throw {statusCode:500,error:"Internal Server Error"};
    }
    fetchagain._id = fetchagain._id.toString();
    return fetchagain;
}

const LikeUnlike = async(recipeId,userId) =>{
    //validate userId
    await validate.validate_ID(recipeId);
    await validate.validate_ID(userId);

    const recipeCollection = await recipes();
    let fetchRecipe = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchRecipe)
    {
        throw {statusCode:404,error:"Recipe with this ID not found"};
    }
   
    let likes_arr = fetchRecipe.likes;
    let remove_flag = 0;
    for(let i=0 ;i<likes_arr.length;i++)
    {
        if(likes_arr[i].toString()===userId)
        {
            remove_flag=1;
            break;
        }
    }
  
    if(remove_flag===1)
    {
        //Remove ID
        let removeUser = await recipeCollection.updateOne({_id:ObjectId(recipeId)},{$pull:{likes:ObjectId(userId)}});
        if(removeUser.modifiedCount===0)
        {
            throw {statusCode:500,error:"Internal Server Error"};
        }
    }
    else{
        //Add ID
        let AddUser = await recipeCollection.updateOne({_id:ObjectId(recipeId)},{$push:{likes:ObjectId(userId)}});
        if(AddUser.modifiedCount===0)
        {
            throw {statusCode:500,error:"Internal Server Error"};
        }
    }

    //fetch again
    let fetchlast = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchlast)
    {
        throw {statusCode:500,error:"Internal Server Error"};
    }
    fetchlast._id = fetchlast._id.toString();
    for(let j=0;j<fetchlast.likes.length;j++)
    {
        fetchlast.likes[j]=fetchlast.likes[j].toString();
    }

    return fetchlast;
}

const RemoveComment = async (recipeId, commentId,userID) =>{
    //validate both the Ids
    await validate.validate_ID(recipeId);
    await validate.validate_ID(commentId);
    await validate.validate_ID(userID);

    const recipeCollection = await recipes();
    let fetchRecipe = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchRecipe)
    {
        throw {statusCode:404, error:"Recipe not found"};
    }

    let comments = fetchRecipe.comments;
    let Id_match_flag=0;

    for(let i=0;i<comments.length;i++)
    {
        if(comments[i]._id.toString()===commentId && comments[i].userThatPostedComment._id.toString()===userID)
        {
            Id_match_flag=1;
            break;
        }
    }
    if(Id_match_flag===0)
    {
        throw {statusCode:400, error:"Either No Comment with given ID found or the User can only delete the comments made by him"};
    }

    //Remove Comment 
    let removeComment = await recipeCollection.updateOne({_id:ObjectId(recipeId)},{$pull:{comments:{_id:ObjectId(commentId)}}});
    if(removeComment.modifiedCount===0)
    {
        throw {statusCode:500,error:"Internal Server Error"};
    }

    //fetch again
    let fetchlast = await recipeCollection.findOne({_id:ObjectId(recipeId)});
    if(!fetchlast)
    {
        throw {statusCode:500,error:"Internal Server Error"};
    }
    fetchlast._id = fetchlast._id.toString();

    return fetchlast;
}

module.exports = {
    addComments,
    LikeUnlike,
    RemoveComment
}