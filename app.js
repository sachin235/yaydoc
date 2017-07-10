var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var passport = require("passport");
var dotenv = require("dotenv");
var session = require("express-session");
var mongoose = require("mongoose");

dotenv.config({path: './.env'});
require('./util/passport')(passport);

mongoose.connect(process.env.MONGODB_URI, {
  useMongoClient: true
});

/**
 * Backend Scripts
 */
var generator = require("./backend/generator");
var deploy = require("./backend/deploy");


var app = express();

/**
 * Socket.io dependencies
 */
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.io = io;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET,
  resave: true,
  saveUninitialized: true,
  store: new session.MemoryStore()
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

app.use("/preview", express.static(path.join(__dirname, "temp")))

app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use("/deploy", require("./routes/deploy"));
app.use("/ci", require("./routes/ci"));

/**
 * Server-side Event Handling
 */
io.on('connection', function(socket){
  socket.on('execute', function (formData) {
    generator.executeScript(socket, formData);
  });

  socket.on('ghpages-deploy', function (data) {
    deploy.deployPages(socket, data);
  });

  socket.on('heroku-deploy', function (formData) {
    deploy.deployHeroku(socket, formData);
  });

  socket.on('retrieve-detailed-logs', function (data) {
    generator.retrieveLogs(socket, data);
  })
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
