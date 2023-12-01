const mongoCollections = require('../config/mongoCollections');
const validate = require('../validations');
const user = mongoCollections.user;
const {ObjectId} = require('mongodb');
const bcrypt = require ('bcrypt');
const saltRounds = 16;

const createUser = async(name, username, password)=>{

    //Put validations here
    
    await validate.validate_name(name);
    await validate.validate_user_pass(username,password);

    name = name.trim()
    username = username.trim();
    password = password.trim();

    let encryptionPassword = await bcrypt.hash(password,saltRounds);

    const userCollection = await user();

    let userObj = {
        name: name,
        username: username,
        password: encryptionPassword
    }

    //first check if there is any user with same username
    const findUser = await userCollection.findOne({username:username});
    if(findUser)
    {
        throw {statusCode:400, error:"Another user with same username exsists"};
    }


    const insertUser = await userCollection.insertOne(userObj);
    if(!insertUser.acknowledged || !insertUser.insertedId)
    {
        throw {statusCode: 500, error: "Internal server error"};
    }
    const getBackUser = await userCollection.findOne({_id:insertUser.insertedId});
    if(!getBackUser)
    {
        throw {statusCode: 500, error: "Internal server error"};
    }
    getBackUser._id = getBackUser._id.toString();
    return getBackUser;
}


const verifyUserPass = async(username,password) =>{
//validations here
    await validate.validate_user_pass(username,password);

    let userCollection = await user();
    let findUser = await userCollection.findOne({username: username});
    if(!findUser)
    {
        throw {statusCode:404, error:"User does not exsist"};
    }

    let CheckPass = await bcrypt.compare(password,findUser.password);
    if(!CheckPass)
    {
        throw {statusCode:500, error:"Invalid Password"}
    }
    findUser._id = findUser._id.toString();
    return findUser;
};

module.exports = {
    createUser,
    verifyUserPass
}