var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/:id([0-9]{1,10})', async function(req, res) {     
    let id = parseInt(req.params.id); 
    console.log(id)
    var raspored =  (await db.query
        ('select  utakoloid,goltima, goltimb,t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima')).rows
    var raspored1 =  (await db.query
        ('select  t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb')).rows

    for (var i = 0; i < raspored.length; i++){
        raspored[i].nazivtimb = raspored1[i].nazivtimb;
    }
    console.log(raspored)
    res.render('fixtures', {
        title: 'Raspored utakmica',
        linkActive: 'fixtures',    
        raspored: raspored,
        idk: id
    });
});

module.exports = router;
