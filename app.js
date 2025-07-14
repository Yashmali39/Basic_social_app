const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const userModel = require('./models/user');
const postModel = require('./models/post');
const post = require('./models/post');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const upload = require('./config/multerconfig');


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true})); 
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")))

app.get('/profile/upload', (req, res)=>{
    res.render('profileupload');
})

app.get('/', (req, res)=>{
    res.render("index");
})

app.get('/login', (req, res)=>{
    res.render('login');
})

app.get('/profile', isLoggedIn, async (req, res)=>{
    console.log(req.user);
    let puser = await userModel.findOne({email: req.user.email}).populate("posts");
    let users = await userModel.find().populate("posts");
    console.log(users);
    //console.log(puser.posts);
    res.render('profile', {puser, users});
})

app.get('/like/:id',isLoggedIn, async (req, res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    console.log(req.user.userid);
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/profile');

})

app.get('/edit/:id', isLoggedIn, async (req, res)=>{
    let post = await postModel.findOne({_id: req.params.id});
    let user = await userModel.findOne({_id: req.user.userid});

    res.render('edit', {user, post});
})

app.get('/logout', (req, res)=>{
    res.cookie('token', "");
    res.redirect('/login');
})

app.post('/upload',isLoggedIn, upload.single('image'), async (req, res)=>{
    let user = await userModel.findOne({_id: req.user.userid});
    user.profilepic = req.file.filename;
    await user.save();
    console.log(req.file);
    console.log(user);
    res.redirect('/profile'); 

})


app.post('/create', async (req, res)=>{
    let {email, username, age, password, name} = req.body;
    let user = await userModel.findOne({email});
    if(user)return res.status(500).send("User Alredy Exist");

    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(password, salt, async (err, hash)=>{
            console.log(salt)
            console.log(hash)
            let createduser = await userModel.create({
                username,
                name,
                age,
                email,
                password : hash
            })
            console.log(createduser);
            let token = jwt.sign({email, userid: createduser._id}, 'secretkey')
            res.cookie('token', token);
            res.send("User created!");
        })

    
    })
    

})

app.post('/edit/:id', async (req, res)=>{
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
    console.log(post);
    res.redirect('/profile');

})

app.post('/login', async (req, res)=>{
    let {email, username, age, password, name} = req.body;
    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something Went Wrong");

    bcrypt.compare(password, user.password, (err, result)=>{
        if(result){
            let token = jwt.sign({email, userid: user._id}, 'secretkey')
            res.cookie('token', token);
            res.redirect('/profile');

        }
        else res.status(500).send("Something Went Wrong");
        
    })

})

app.post('/post', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email});
    let createdpost = await postModel.create({
        user: user._id,
        content: req.body.content
    })
    // console.log(req.user);
    // res.render('profile', {puser});
    user.posts.push(createdpost._id);
    await user.save();
    let posts = await postModel.find();
    res.redirect('/profile');
})



function isLoggedIn(req, res, next){
    console.log(req.cookies);
    if(req.cookies.token === "") res.redirect('/login');
    else{
        let data = jwt.verify(req.cookies.token, "secretkey");
        req.user = data;        
    }
    next();
}
app.listen(3000);