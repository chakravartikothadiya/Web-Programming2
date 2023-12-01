const express = require('express');
const session = require('express-session');
const app = express();
const configRoutes = require('./routes');
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {});

let HashUrlMap = new Map;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(session({
    name: 'AuthCookie',
    secret: 'some secret string!',
    resave: false,
    saveUninitialized: true
  }));


app.use(async(req,res,next)=>{
if(req.body)
{
    if(!req.body.password)
    {
        console.log("req.body: "+JSON.stringify(req.body));
    }
    else if(req.body.password)
    {
        let password = req.body.password;

        delete req.body.password;
        console.log(JSON.stringify(req.body));
        req.body.password=password;
    }   
    console.log("URL: "+req.originalUrl);
    console.log("METHOD = "+req.method);
}
next();
});


app.use(async(req,res,next)=>{

    if(req.url in HashUrlMap)
    {
        HashUrlMap[req.url]++;
    }
    else
    {
        HashUrlMap[req.url]=1;
    }
    console.log(req.url+" : count="+HashUrlMap[req.url]);
    next();
});


app.use('/recipes',async(req,res,next)=>{
    try
    {
        if(req.method==='POST' || req.method==='PUT' || req.method==='PATCH' || req.method==='DELETE')
        {
            if(!req.session.username)
            {
                throw {statusCode:403,error:"User must be logged in"};
            }
        }

        let myRegex = /\/[a-f\d]{24}/;
        let url = req.url;
        //FOR GET CASHING USING REDIS
        if(req.method=='GET' && !myRegex.test(url))
        {
            let page = req.query.page;
            if(!page)
            {
                page=1;
            }
            if(await client.get(`page:${page}`))
            {
                return res.send(JSON.parse(await client.get(`page:${page}`)));
            }
        }

    next();
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

app.use('/recipes/:id',async(req,res,next)=>{
    try{
        if(req.method=='GET')
        {
            if(req.params.id)
            {
                let ID = req.params.id;
               
                
                if(await client.get(`recipie_ID:${ID}`))
                {
                    //write to inc the ZADD
                    let obj = await client.get(`recipie_ID:${ID}`);
                    await client.zIncrBy("RECEPIES",1,obj);
                    return res.send(JSON.parse(await client.get(`recipie_ID:${ID}`)));
                }
            }
        }
        next();
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

configRoutes(app);

app.listen(3000, ()=>{
    console.log("We are now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});