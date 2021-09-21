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
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

// MONGOOSE SCHEMA CONFIG
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String
});

// PASSPORT-LOCAL-MONGOOSE PLUGIN SETUP
userSchema.plugin(passportLocalMongoose);

// MONGOOSE MODEL CONFIG
const User = new mongoose.model("User", userSchema);

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
  console.log(profile);
  User.findOne({googleId: profile.id }, function (err, user) {
    if(err){
      console.log(err);
      return done(err);
    }
    // no error so proceed
    if(!user){               // user found
      const user = new User({
        googleId: profile.id
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
  res.render("login");
});

// LOGOUT GET ROUTE
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

// REGISTER GET ROUTE
app.get("/register", function(req, res){
  res.render("register");
});

// SECRETS GET ROUTE
app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    res.render("secrets");
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

// LOGIN POST ROUTE
app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login",
  failureFlash: false
}), function(err) {
  if(err){
    console.log(err);
    res.redirect("/login");
  } else{
    res.redirect("/login");
  }
});

// ================
// ROUTE CONFIG END
// ================

// SERVER HOST
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
