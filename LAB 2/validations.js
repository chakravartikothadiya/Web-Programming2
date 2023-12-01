const { ObjectId } = require("mongodb");

const validate_recipe = async (title, ingredients, steps, cookingSkillRequired) =>
{
    if(!title || !ingredients || !steps || !cookingSkillRequired)
    {
        throw {statusCode:400, error:"All values needs to be filled"};
    }
    await validate_title(title);
    await validate_ingredients(ingredients);
    await validate_steps(steps);
    await validate_cookingSkillRequired(cookingSkillRequired);
}

const validate_title = async (title) =>
{
    let space = /\s/;
    let letters = /[a-zA-Z]/;
    let special = /[^a-zA-Z0-9 ]/;
    if(typeof(title)!=='string' || title.trim().length===0)
    {
        throw {statusCode:400, error:"Invalid values for title"};
    }

    if(!letters.test(title))
    {
        throw {statusCode:400, error:"There needs to be alteast one character in title"};
    }
    if(special.test(title))
    {
        throw {statusCode:400, error:"No special characters allowed in title"};
    }
    title = title.trim();
}

const validate_ingredients = async (ingredients) => {
    let space = /\s/;
    let letters = /[a-zA-Z]/;
    let special = /[^a-zA-Z0-9 ]/;
       //Ingredients
       if(typeof(ingredients)!=='object' || !Array.isArray(ingredients))
       {
           throw {statusCode:400, error:"ingredients should be a valid array of strings"};
       }
       if(ingredients.length<3)
       {
           throw {statusCode:400,error:"Atleast 3 ingredients should be present"};
       }
       for(let j=0;j<ingredients.length;j++)
       {
           if(typeof(ingredients[j])!=='string' || ingredients[j].trim().length<3 || ingredients[j].trim().length>50 || special.test(ingredients[j]) || !letters.test(ingredients[j]))
           {
               throw {statusCode:400,error:"ingredients should be a valid array of strings"};
           }
           ingredients[j]=ingredients[j].trim();
       }
}

const validate_steps = async (steps) =>{
    let space = /\s/;
    let letters = /[a-zA-Z]/;
    let special = /[^a-zA-Z0-9 ]/;
        //steps 
        if(typeof(steps)!=='object' || !Array.isArray(steps))
        {
            throw {statusCode:400, error:"steps should be a valid array of strings"};
        }
        if(steps.length<5)
        {
            throw {statusCode:400,error:"Atleast 5 steps should be present"};
        }
        for(let j=0;j<steps.length;j++)
        {
            if(typeof(steps[j])!=='string' || steps[j].trim().length<20 || special.test(steps[j]) || !letters.test(steps[j]))
            {
                throw {statusCode:400,error:"steps should be a valid array of strings"};
            }
            steps[j]=steps[j].trim();
        }
}

const validate_cookingSkillRequired = async (cookingSkillRequired) =>
{
    let space = /\s/;
    let letters = /[a-zA-Z]/;
    let special = /[^a-zA-Z0-9]/;
    
        //cookingSkillRequired
        if(typeof(cookingSkillRequired)!=='string')
        {
            throw {statusCode:400, error:"cookingSkillRequired should a valid string"};
        }
        if(cookingSkillRequired.toLowerCase()!=="novice" && cookingSkillRequired.toLowerCase()!=="intermediate" && cookingSkillRequired.toLowerCase()!=="advanced")
        {
            throw {statusCode:400, error:"Invalid values for cookingSkillRequired"};
        }
}

const validate_ID = async (ID) =>
{   
    if(!ID || !ObjectId.isValid(ID))
    {
        throw {statusCode:400, error:"Invalid values for ID"};
    }
}

//validate username and password 
const validate_user_pass = async (username, password) =>{
    let spChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    let spaces = /[ ]+/;
    let alpha = /[A-Z]+/;
    let numeric = /[0-9]+/;
    
      if(!username || !password || typeof(username)!=='string' || typeof(password)!=='string')
      {
        throw {statusCode:400, error:"Enter a valid usename and password"};
      }
      if(username.trim().length===0 || password.trim().length===0)
      {
        throw {statusCode:400, error:"Enter a valid usename and password"};
      }
      if(username.trim().length<3)
      {
        throw {statusCode:400, error:"Username should be atlest 3 letters"};
      }
    
      if(spChars.test(username) || spaces.test(username))
      {
        throw {statusCode:400, error:"Username should be alphanumeric characters only without any spaces"};
      }
      if(spaces.test(password))
      {
        throw {statusCode:400, error:"No spaces allowed in password"};
      }
      if(password.trim().length<6)
      {
        throw {statusCode:400, error:"Passsword should be atleast 6 characters"};
      }
      if(!spChars.test(password) || !alpha.test(password) || !numeric.test(password))
      {
        throw {statusCode:400, error:"Password should follow all the required constraints"};
      }
};

const validate_name = async(name) =>{

    let spChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    let num = /[0-9]/;
    if(!name || typeof(name)!=='string' || name.trim().length===0)
    {
        throw {statusCode:400, error:"Invlid value for name"};
    }

    name=name.trim();
    let strArr = name.split(" ");
    if(strArr.length!==2)
    {
      throw {statusCode:400, error:"Incorrect Name format"};
    }
    let str1 = strArr[0];
    let str2 = strArr[1];
   
    if(spChars.test(str1) || num.test(str1) || spChars.test(str2) || num.test(str2))
    {
      throw {statusCode:400, error:"Name should not have special characters or numbers"};
    }
    if(str1.length<2 || str2.length<2)
    {
      throw {statusCode:400, error:"Firname and Lastname should have atleast 2 characters"};
    }
}


module.exports = {
    validate_recipe,
    validate_ID,
    validate_cookingSkillRequired,
    validate_ingredients,
    validate_title,
    validate_steps,
    validate_user_pass,
    validate_name
}