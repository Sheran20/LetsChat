require('dotenv').config();

//express
const express = require("express");
const app = express();

//css
app.use(express.static("public"));

//ejs
const ejs = require("ejs");
app.set('view engine', 'ejs');

//body-parser
const bodyParser = require("body-parser");
app.use(express.urlencoded({extended: true}));

//express-session
const session = require("express-session");

//passport
const passport = require("passport");

//passport-local-mongoose
const passportLocalMongoose = require("passport-local-mongoose");

//express-sessions & passport setup
app.use(session({
  secret: process.env.PASSPORT_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//mongoose
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

//mongoose schema
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

//passport-local-mongoose setup as plugin
userSchema.plugin(passportLocalMongoose);

//mongoose model
const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//routes
app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else{
    res.redirect("/login");
  }
});

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

//Server Host
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
