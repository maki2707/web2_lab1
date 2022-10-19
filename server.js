require('dotenv').config();
const express = require('express');
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');
const app = express();
var path = require('path');
const db = require('./db');
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const config = {
    authRequired: false,
    auth0Logout: true,
    secret: 'a long, randomly-generated string stored in env',
    baseURL: externalUrl || `http://localhost:${port}`,
    clientID: '0W85KzQVaYujELGM6n5fSw6YMqFBEMzE',
    issuerBaseURL: 'https://dev-vrohkyc3.us.auth0.com'
  };



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));

app.use(auth((config)));

//home routes
app.get('/', async function(req, res) {    
  var tablica = (await db.query('SELECT * FROM tablica ORDER BY bodovi DESC, "golRazlika" DESC')).rows
  var user = null;
  if (req.oidc.isAuthenticated()) {
    user = req.oidc.user
  }
  res.render('home', {
      title: 'Home',
      linkActive: 'home',       
      tablica: tablica,
      user: user
      
  });
});


//fixtures routes
app.get('/fixtures/:id([0-9]{1,10})',requiresAuth(), async function(req, res) {     
  let id = parseInt(req.params.id); 
  console.log(id)
  var raspored =  (await db.query
      ('select  idutakmica,utakoloid,goltima, goltimb,t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima')).rows
  var raspored1 =  (await db.query
      ('select  t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb')).rows

  for (var i = 0; i < raspored.length; i++){
      raspored[i].nazivtimb = raspored1[i].nazivtimb;
  }
  var user = null;
  if (req.oidc.isAuthenticated()) {
    user = req.oidc.user
  }
  res.render('fixtures', {
      title: 'Raspored utakmica',
      linkActive: 'fixtures',    
      raspored: raspored,
      idk: id,
      user: user
  });
});

app.get('/fixtures/admin/:id([0-9]{1,10})', async function(req, res) {     
  let id = parseInt(req.params.id); 
  console.log(id)
  var utakmica =  (await db.query
      ('select  idutakmica, goltima, goltimb,t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima WHERE idutakmica = 412')).rows
  var utakmica1 =  (await db.query
      ('select  t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb WHERE idutakmica = ($1)',[id])).rows
    console.log(utakmica)
  var tekma = utakmica.shift()
  var user = null;
  if (req.oidc.isAuthenticated()) {
    user = req.oidc.user
    res.render('edit-fixture', {
      title: 'Admin - promjena',
      linkActive: 'edit-fixtures',    
      utakmica: tekma,
      utaid: id,
      user: user
  });
  }
 
});

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});


console.log("server started.....")
if (externalUrl) {
    const hostname = '127.0.0.1';
    app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from
    outside on ${externalUrl}`);
    });
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
