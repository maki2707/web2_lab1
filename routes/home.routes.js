var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {    
    var tablica = (await db.query('SELECT * FROM tablica ORDER BY bodovi DESC, "golRazlika" DESC')).rows
    res.render('home', {
        title: 'Home',
        linkActive: 'home',       
        tablica: tablica
    });
});

module.exports = router;
