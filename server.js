// Require dependencies
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
var Key = require("./keys.js");
// Scraping tools
var request = require("request");
var cheerio = require("cheerio");

var Promise = require("bluebird");

mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect(Key);
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes

// Index route
app.get("/", function(req, res) {
  res.send(index.html);
});

// A GET request to scrape the NYT website
app.get("/scrape", function(req, res) {

  request("https://www.reddit.com/r/nottheonion/", function(error, response, html) {
    // $ for a shorthand selector
    var $ = cheerio.load(html);

    $("p.title").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      var entry = new Article(result);

      // If this title element had both a title and a link
      if (result.title && result.link) {
        // save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });
      }
    });
  });
  // Tell the browser that we finished scraping the text
  res.send("Scrape Complete");
});

// articles scraped from the mongoDB
app.get("/articles", function(req, res) {

  Article.find({}, function(err, doc) {
    if (err) throw err;
    res.send(doc);
  });

});

// This will grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {

  Article.findOne({"_id": req.params.id})
    // and run the populate method with "note",
    .populate("note")
  // then responds with the article with the note included
    .exec(function(err, doc) {
      if (err) throw err;
      res.send(doc);
    });
 });

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {

  var newNote = new Note(req.body);
  // save the new note that gets posted to the Notes collection
  newNote.save(function(err, doc) {
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
  if (err) throw err;
  Article.findOneAndUpdate({"_id": req.params.id}, {"note": doc._id})
  .exec(function(err, doc) {
    if (err) throw err;
    res.send(doc);
    });
  });
});


// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
