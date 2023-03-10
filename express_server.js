const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const users = require('./users');
const cookieSession = require('cookie-session');
const { generateRandomString, createUser, urlsForUser, getUserByEmail } = require('./helpers');
const { urlDatabase } = require("./database");
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  const user = users[req.session.userID];
  if (!user) {
    // if user is not logged in, redirect to /login
    res.redirect("/login");
    // if logged in, redirect to /urls
  } else {
    res.redirect("/urls");
  }
});


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const user = users[req.session.userID];
  if (!user) {
    // if user is not logged in, return an error message
    res.status(401).send('You need to log in first!');
  } else {
    // if user is logged in, retrieve their URLs and render the urls_index page
    const userURLs = urlsForUser(user.id);
    const templateVars = { urls: userURLs, user };
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.userID; // Read the userID cookie
  if (userId) {
    const user = users[userId];
    const templateVars = { user };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const user = users[req.session.userID];
  const url = urlDatabase[id];

  if (!user) {
    // if user is not logged in, return HTML with a relevant error message
    res.status(401).send("You need to be logged in to access this page.");
  } else if (!url) {
    // if URL does not exist, return a 404 error page
    res.status(404).render("404");
  } else if (url.userID !== user.id) {
    // if URL does not belong to user, return HTML with a relevant error message
    res.status(401).send("You do not have access to this URL.");
  } else {
    // if user is logged in and URL belongs to them, render the urls_show page
    const templateVars = { id, longURL: url.longURL, user };
    res.render("urls_show", templateVars);
  }
});

app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  const user = users[req.session.userID];
  const url = urlDatabase[id];
  
  if (!url) {
    res.status(404).send("URL not found");
  } else if (!user) {
    res.status(401).send("Please login to delete URLs");
  } else if (url.userID !== user.id) {
    res.status(403).send("You do not own this URL");
  } else {
    delete urlDatabase[id];
    res.redirect("/urls");
  }
});

app.post("/urls", (req, res) => {
  const userId = req.session.userID; // Read the userID cookie
  if (userId) {
    const id = generateRandomString();
    const longURL = req.body.longURL;
    urlDatabase[id] = { longURL: longURL, userID: userId };
    res.redirect(`/urls/${id}`);
  } else {
    res.status(401).send("You must be logged in to shorten URLs.");
  }
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL].longURL;
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("<h1>Short URL not found</h1>");
  }
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const user = users[req.session.userID];
  const url = urlDatabase[id];
  
  if (!url) {
    res.status(404).send("URL not found");
  } else if (!user) {
    res.status(401).send("Please login to edit URLs");
  } else if (url.userID !== user.id) {
    res.status(403).send("You do not own this URL");
  } else {
    const updatedLongURL = req.body.longURL;
    url.longURL = updatedLongURL;
    res.redirect("/urls");
  }
});


app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Invalid email or password.");
  } else {
    req.session.userID = user.id; // Store the user ID in the session
    res.redirect("/urls");
  }
});

app.get("/login", (req, res) => {
  const userId = req.session.userID; // Read the userID cookie
  const user = users[req.session.userID];
  if (userId) {
    // If the cookie exists, redirect the user to /urls
    res.redirect("/urls");
  } else {
    // If the cookie doesn't exist, render the login page
    res.render("login", { user: user });
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  const userId = req.session.userID; // Read the userID cookie
  const user = users[req.session.userID];
  if (userId) {
    // If the cookie exists, redirect the user to /urls
    res.redirect("/urls");
  } else {
    // If the cookie doesn't exist, render the register page
    res.render("register", { user: user });
  }
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (email === "" || password === "") {
    res.status(400).send("Email or password cannot be empty.");
  } else {
    const user = getUserByEmail(email, users);
    if (user) {
      res.status(400).send("Email already exists. Please try again.");
    } else {
      const newUserID = createUser(email, password, users);
      req.session.userID = newUserID;
      res.redirect("/urls");
    }
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


