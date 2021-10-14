// ========================
// ENVIRONMENT CONFIG START
// ========================

require('dotenv').config();

// EXPRESS
const express = require("express");
const app = express();

// CSS
app.use(express.static("public"));

// EJS
const ejs = require("ejs");
app.set('view engine', 'ejs');

// BODY-PARSER
const bodyParser = require("body-parser");
app.use(express.urlencoded({extended: true}));

// EXPRESS-SESSION
const session = require("express-session");

// PASSPORT
const passport = require("passport");

// PASSPORT-LOCAL-MONGOOSE
const passportLocalMongoose = require("passport-local-mongoose");

// GOOGLE 0AUTH2
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// EXPRESS-SESSIONS & PASSPORT CONFIG
app.use(session({
  secret: process.env.PASSPORT_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// MONGOOSE
const mongoose = require("mongoose");
mongoose.connect(process.env.DB_KEY);

// MONGOOSE SCHEMA CONFIG
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secrets: Array
});

const messageSchema = new mongoose.Schema ({
  user: String,
  content: String
});

const chatSchema = new mongoose.Schema ({
  name: String,
  messages: [messageSchema]
});

// PASSPORT-LOCAL-MONGOOSE PLUGIN SETUP
userSchema.plugin(passportLocalMongoose);

// MONGOOSE MODEL CONFIG
const User = new mongoose.model("User", userSchema);
const Message = new mongoose.model("Message", messageSchema);
const Chat = new mongoose.model("Chat", chatSchema);

passport.use(User.createStrategy());

// PASSPORT COOKIE CONFIG serialization
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// GOOGLE OAUTH CONFIG
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, done) {
  // console.log(profile);
  User.findOne({googleId: profile.id }, function (err, user) {
    if(err){
      console.log(err);
      return done(err);
    }
    // no error so proceed
    if(!user){
      const user = new User({
        googleId: profile.id,
        username: profile.displayName
      });
      user.save(function(err){
        if(err) console.log(err, user);
        return done(err,user);
      });
    } else{ // found user
      return done(err, user);
    }
  });
}
));

// ======================
// ENVIRONMENT CONFIG END
// ======================

// ======================
// HELPER FUNCTIONS
// ======================

// CLEAR CACHE
function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

// ==================
// ROUTE CONFIG START
// ==================

// HOME GET ROUTE
app.get("/", function(req, res){
  res.render("home");
});

// GOOGLE AUTH GET ROUTE 1
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"]})
);

// GOOGLE AUTH GET ROUTE 2
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
  // Successful authentication, redirect secrets.
  res.redirect('/secrets');
});

// LOGIN GET ROUTE
app.get("/login", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/secrets");
  } else{
    res.render("login");
  }
});

// LOGOUT GET ROUTE
app.get("/logout", function(req, res){
  req.logout();
  res.redirect('/');
});

// REGISTER GET ROUTE
app.get("/register", function(req, res){
  res.render("register");
});

// SECRETS GET ROUTE
app.get("/secrets", nocache, function(req, res){

  if(req.isAuthenticated()){
    
    Chat.findOne({name: "general"}, function (err, foundChat) {
      if(err){
        console.log(err);
      } else{
        res.render("secrets",{
          chat: foundChat
        });
      }
    });

  } else{
    res.redirect("/login");
  }
});

// SUBMIT GET ROUTE
app.get("/submit", function(req, res) {
  if(req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
});

// REGISTER POST ROUTE
app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

// SECRETS POST ROUTE
app.post("/secrets", function(req, res) {

  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser) {
    if(err) {
      console.log(err);
    } else{
      if (foundUser) {

        const message = new Message({
          user: foundUser.username,
          content: submittedSecret
        });

        foundUser.secrets.push(message);
        foundUser.save();


        Chat.findOne({name: "general"}, function (err, foundChat) {
          if(err){
            console.log(err);
          } else{
            foundChat.messages.push(message);
            foundChat.save(function(){
              res.redirect("/secrets");
            });
          }
        });
      }
    }
  });


});

// LOGIN POST ROUTE
app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login",
  failureFlash: false
}));

// ================
// ROUTE CONFIG END
// ================

// SERVER HOST
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
