const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
var pug = require('pug');
const fs = require('fs').promises;
var uuidv4 = require('uuid').v4;
var session = require("express-session");
const express = require('express');
const path = require('path');
const app = express();

// view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// static files
app.use(express.static(path.join(__dirname, 'public')));