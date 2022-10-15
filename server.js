require('dotenv').config();

const express = require('express');
const app = express();
var path = require('path');

const homeRouter = require('./routes/home.routes');
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));

app.use('/', homeRouter);

console.log("server started")
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
