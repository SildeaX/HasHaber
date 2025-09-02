const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const pug = require('pug');
const fs = require('fs').promises;
const uuidv4 = require('uuid').v4;
const session = require("express-session");
const express = require('express');
const path = require('path');
const { save } = require('fs');
const app = express();

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

// view engine
app.set('view engine', 'pug');
app.set('views', 'Views');

// static files
app.use(express.static('Public'));

app.use(session({
    secret: 'sample-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(postTrimmer);

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

app.get("/login", function (req, res) {
    res.render("login.pug");
});

app.get("/register", function (req, res) {
    res.render("register.pug");
});

app.get("/news-posting-page", function (req, res) {
    res.render("news-posting-page.pug");
});

app.get("/news-page", function (req, res) {
    res.render("news-page.pug");
});

app.get("/", async function (req, res) {
    let allNews = await fetchNewsDB();
    currentNews = allNews.slice(-5).reverse();
    res.render("main.pug", { mainNews: currentNews, user: req.session.user || undefined });
});

app.get("/api/news-page/:newsID", async function (req, res) {
    const newsDatabase = await fetchNewsDB();
    const newsID = parseInt(req.params.newsID, 10);
    const newsData = newsDatabase.find(currentNews => currentNews.newsID === newsID);

    if (newsData === undefined) {
        return res.status(404).send("Cannot find any news.");
    }

    return res.render("news-page.pug", { mainNews: newsData, user: req.session.user || undefined });
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

// Fetch existing users asynchronously
async function fetchUserDB() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'userDB.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Save user data asynchronously
async function saveUserDB(data) {
    await fs.writeFile(path.join(__dirname, 'Database', 'userDB.json'), JSON.stringify(data, null, 2), 'utf8');
}

// Fetch existing news asynchronously
async function fetchNewsDB() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'newsDB.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Save news data asynchronously
async function saveNewsDB(data) {
    await fs.writeFile(path.join(__dirname, 'Database', 'newsDB.json'), JSON.stringify(data, null, 2), 'utf8');
}

// Fetch news counter
async function fetchNewsCounter() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'newsCounter.json'), 'utf8');
        return JSON.parse(data).lastId;
    } catch (err) {
        return 0;
    }
}

// Write news counter
async function saveNewsCounter(newId) {
    await fs.writeFile(
        path.join(__dirname, 'Database', 'newsCounter.json'),
        JSON.stringify({ lastId: newId }, null, 2),
        'utf8'
    );
}

// Middleware to trim whitespace from POST request body
function postTrimmer(req, res, next) {
    if (req.method === 'POST') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof (value) === 'string')
                req.body[key] = value;
        }
    }
    next();
}

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//Register Page
app.post("/api/register", async function (req, res) {
    const { name, surname, email, password, confirmPassword, isLoggedIn } = req.body;

    if (!name.trim().length || !surname.trim().length || !email.trim().length || !password.trim().length || !confirmPassword.trim().length) {
        return res.send('Please fill in each part.');
    }

    if (password !== confirmPassword) {
        return res.send("Passwords didn't match.");
    }

    let userDatabase = await fetchUserDB();

    if (userDatabase.some(user => user.email === email)) {
        return res.send("This email is already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: uuidv4(),
        name: name,
        surname: surname,
        email: email,
        password: hashedPassword,
        isLoggedIn: false,
    };

    userDatabase.push(newUser);
    await saveUserDB(userDatabase);
    return res.redirect('/');
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//Login Page
app.post("/api/login", async function (req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send('Please fill in each part.');
    }

    const userDatabase = await fetchUserDB();
    const user = userDatabase.find(user => user.email === email);

    if (!user) {
        return res.send("No user found with this email.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.send("Wrong password.");
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        isLoggedIn: true
    }
    req.session.save()

    const userIndex = userDatabase.findIndex(u => u.email === email);
    console.log(userIndex);
    userDatabase[userIndex].isLoggedIn = true;
    await saveUserDB(userDatabase);

    return res.redirect('/');
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//Logout Function
app.post("/api/logout", async function (req, res) {
    if (req.session.user) {
        let userDatabase = await fetchUserDB();
        const userIndex = userDatabase.findIndex(user => user.id === req.session.user.id);
        if (userIndex !== -1) {
            userDatabase[userIndex].isLoggedIn = false;
            await saveUserDB(userDatabase);
        }
        req.session.destroy();
    }
    res.redirect("/");
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//News Posting Function
app.post("/api/news-posting-page", async function (req, res) {
    const { title, content, url } = req.body;

    let newsDatabase = await fetchNewsDB();

    if (req?.session?.user?.isLoggedIn !== true) {
        return res.send("You must be logged in to post news.");
    }

    if (!title.trim().length || !content.trim().length || !url.trim().length) {
        return res.send("Please fill in each part.");
    }

    // New ID generation using newsCounter.json
    let lastId = await fetchNewsCounter();
    let newsID = lastId + 1;
    await saveNewsCounter(newsID);

    const newsData = {
        newsID: newsID,
        title: title,
        content: content,
        url: url,
        author: req.session.user.id,
        createdAt: new Date().toISOString()
    };

    newsDatabase.push(newsData);
    await saveNewsDB(newsDatabase);

    return res.redirect('/');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});