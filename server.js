const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
var pug = require('pug');
const fs = require('fs').promises;
var uuidv4 = require('uuid').v4;
var session = require("express-session");
const express = require('express');
const path = require('path');
const app = express();

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

// view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'sample-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

app.use(express.static("html"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "Views", "main.html"));
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

// Read existing users asynchronously
async function readUserDB() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'userDB.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Write user data asynchronously
async function writeUserDB(data) {
    await fs.writeFile(path.join(__dirname, 'Database', 'userDB.json'), JSON.stringify(data, null, 2), 'utf8');
}

// Read existing news synchronously
async function readNewsDB() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'newsDB.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Write news data synchronously
async function writeNewsDB(data) {
    await fs.writeFile(path.join(__dirname, 'Database', 'newsDB.json'), JSON.stringify(data, null, 2), 'utf8');
}

// Read news counter
async function readNewsCounter() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'Database', 'newsCounter.json'), 'utf8');
        return JSON.parse(data).lastId;
    } catch (err) {
        return 0;
    }
}

// Write news counter
async function writeNewsCounter(newId) {
    await fs.writeFile(
        path.join(__dirname, 'Database', 'newsCounter.json'),
        JSON.stringify({ lastId: newId }, null, 2),
        'utf8'
    );
}

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//Register Page
app.post("/api/register", async function (req, res) {
    const { name, surname, email, password, confirmPassword, isLoggedIn } = req.body;

    if (!name || !surname || !email || !password || !confirmPassword) {
        return res.send('Please fill in each part.');
    }

    else if (password !== confirmPassword) {
        return res.send("Passwords didn't match.");
    }

    let userDatabase = await readUserDB();

    if (userDatabase.some(user => user.email === email)) {
        return res.send("This email is already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        uuid: uuidv4(),
        name: name,
        surname: surname,
        email: email,
        password: hashedPassword,
        isLoggedIn: false,
    };

    userDatabase.push(newUser);
    await writeUserDB(userDatabase);
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

    const userDatabase = await readUserDB();
    const user = userDatabase.find(user => user.email === email);

    if (!user) {
        return res.send("No user found with this email.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.send("Wrong password.");
    }

    req.session.user = {
        uuid: user.uuid,
        name: user.name,
        surname: user.surname,
        email: user.email,
        isLoggedIn: true
    }
    req.session.save()

    const userIndex = userDatabase.findIndex(u => u.email === email);
    console.log(userIndex);
    userDatabase[userIndex].isLoggedIn = true;
    await writeUserDB(userDatabase);

    return res.redirect('/');
});

/*
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  //////////////////////////////////////////////////////////////////////
*/

//Logout Function
app.post("/api/logout", async function (req, res) {
    if (req.session.user) {
        let userDatabase = await readUserDB();
        const userIndex = userDatabase.findIndex(user => user.uuid === req.session.user.uuid);
        if (userIndex !== -1) {
            userDatabase[userIndex].isLoggedIn = false;
            await writeUserDB(userDatabase);
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

    let newsDatabase = await readNewsDB();

    if (!req.session.user || !req.session.user.isLoggedIn) {
        return res.send("You must be logged in to post news.");
    }

    if (!title || !content || !url) {
        return res.send("Please fill in each part.");
    }

    // New ID generation using newsCounter.json
    let lastId = await readNewsCounter();
    let newsID = lastId + 1;
    await writeNewsCounter(newsID);

    const newsData = {
        id: newsID,
        title: title,
        content: content,
        url: url,
        author: req.session.user.email,
        createdAt: new Date().toISOString()
    };

    newsDatabase.push(newsData);
    await writeNewsDB(newsDatabase);

    return res.redirect('/');
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});