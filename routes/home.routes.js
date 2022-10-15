var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
    var list = (await db.query('SELECT * FROM test1')).rows
    console.log(list)
    res.render('home', {
        title: 'Home',
        linkActive: 'home',
        list: list
    });
});

module.exports = router;
