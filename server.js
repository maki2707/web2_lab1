require("dotenv").config();
const express = require("express");
const {
  auth,
  requiresAuth,
  claimCheck,
  claimIncludes,
  claimEquals
} = require("express-openid-connect");
const https = require("https");
const fs = require("fs");
const app = express();
var path = require("path");
const db = require("./db");
const {
  ResultWithContext
} = require("express-validator/src/chain");
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const config = {
  authRequired: false,
  auth0Logout: true,
  idpLogout: true,
  secret: process.env.SECRET,
  baseURL: externalUrl || `http://localhost:${port}`,
  clientID: "0W85KzQVaYujELGM6n5fSw6YMqFBEMzE",
  clientSecret: process.env.CLIENT_SECRET,
  issuerBaseURL: "https://dev-vrohkyc3.us.auth0.com",
  authorizationParams: {
    response_type: "code",
    scope: "openid profile email",
  },
    
};
/*********************************************************************************************************************************/

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({
  extended: true
}));
app.use(auth(config));


/*********************************************************************************************************************************/
/****************************** R  O  U  T  E  S *********************************************************************************/

/****************************** H O M E     R  O  U  T  E  S *********************************************************************/
app.get("/", async function (req, res) {
  var tablica = ( await db.query( 'SELECT * FROM tablica ORDER BY bodovi DESC, "golrazlika" DESC')).rows;
  var user = null;
  if (req.oidc.isAuthenticated()) {
    user = req.oidc.user;
  }
  res.render("home", {
    title: "Home",
    linkActive: "home",
    tablica: tablica,
    user: user,
  });
});

/***************************** F I X T U R E S     R  O  U  T  E  S ****************************************************************/

app.get("/fixtures/:id([0-9]{1,10})", async function (req, res) {
  let id = parseInt(req.params.id);
  var raspored = null;
  raspored = (
    await db.query(
      "select  idutakmica,utakoloid,goltima, goltimb,t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima WHERE utakoloid =$1 ORDER BY idutakmica",
      [id]
    )
  ).rows;
  var raspored1 = (
    await db.query(
      "select  t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb WHERE utakoloid = $1 ORDER BY idutakmica",
      [id]
    )
  ).rows;
  var komentari = null;
  komentari = (
    await db.query(
      "select * FROM komentar kom INNER JOIN korisnik t1 on t1.idkorisnik = kom.korisnikid WHERE kom.komkoloid = $1 order by vrijemekom",
      [id]
    )
  ).rows;
  for (var i = 0; i < raspored.length; i++) {
    raspored[i].nazivtimb = raspored1[i].nazivtimb;
  }
  var user = null;
  if (req.oidc.isAuthenticated()) {
    user = req.oidc.user;
  }
  res.render("fixtures", {
    title: "Raspored utakmica",
    linkActive: "fixtures",
    raspored: raspored,
    idk: id,
    user: user,
    komentari: komentari,
  });
});

app.post(
  "/fixtures/:id([0-9]{1,10})",
  requiresAuth(),
  async function (req, res) {
    if (req.oidc.isAuthenticated()) {
      user = req.oidc.user;
    }
    let datum = new Date(Date.now()).toISOString();
    let vrijeme = new Date(Date.now()).toLocaleTimeString();
    let komentarid = Date.now();
    let id = parseInt(req.params.id);
    await db.query(
      "INSERT INTO komentar (idkomentar, datumkom, sadrzajkom, komkoloid, korisnikid, vrijemekom) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [komentarid, datum, req.body.komtekst, id, user.sub, vrijeme]
    );
    res.redirect(`/fixtures/${id}`);
  }
);

app.get(
  "/fixtures/comment/edit/:id([0-9]{1,13})",
  requiresAuth(),
  async function (req, res) {
    let id = parseInt(req.params.id);
    let userid = await (await db.query("SELECT * FROM komentar WHERE idkomentar=$1", [id])).rows.shift().korisnikid
    if(req.oidc.user.sub !== userid)
    {
      res.status(401).render('error');
    }
    user = req.oidc.user;
    let komentar = (
      await db.query("SELECT * FROM komentar WHERE idkomentar=$1", [id])
    ).rows.shift();
    res.render("edit-comment", {
      komentar: komentar,
      title: "Promjena komentara",
      linkActive: "edit-comment",
      user: user,
    });
  }
);

app.post(
  "/fixtures/comment/edit/:id([0-9]{1,13})/:idk([0-9]{1,13})",
  requiresAuth(),
  async function (req, res) {
    let id = parseInt(req.params.id);
    let userid = await (await db.query("SELECT * FROM komentar WHERE idkomentar=$1", [id])).rows.shift().korisnikid
    if(req.oidc.user.sub !== userid)
    {
      res.status(401).render('error');
    }    
    let idk = parseInt(req.params.idk);
    let datum = new Date(Date.now()).toISOString();
    let vrijeme = new Date(Date.now()).toLocaleTimeString();
    await db.query(
      "UPDATE KOMENTAR SET datumkom=$2, vrijemekom=$3, sadrzajkom=$4  WHERE idkomentar=$1",
      [id, datum, vrijeme, req.body.komtekst]
    );

    res.redirect(`/fixtures/${idk}`);
  }
);

app.get(
  "/fixtures/delete/:idk([0-9]{1,13})/:id([0-9]{1,13})",
  requiresAuth(),
  async function (req, res) {
    let id = parseInt(req.params.id);
    let userid = await (await db.query("SELECT * FROM komentar WHERE idkomentar=$1", [id])).rows.shift().korisnikid
    if(req.oidc.user.sub !== userid)
    {
      res.status(401).render('error');
    }
    let idk = parseInt(req.params.idk);
    await db.query(`DELETE FROM komentar WHERE idkomentar = $1 RETURNING *`, [
      id,
    ]);
    res.redirect(`/fixtures/${idk}`);
  }
);

/***************************** A  D  M  I  N  S     R  O  U  T  E  S ****************************************************************/

app.get(
  "/fixtures/admin/delete/:idk([0-9]{1,13})/:id([0-9]{1,13})", 
  requiresAuth(),
  async function (req, res) {
    if(claimEquals("is_admin",false))
    {
      res.status(401).render('error');
    }
    let id = parseInt(req.params.id);
    let idk = parseInt(req.params.idk);
     
    await db.query(`DELETE FROM komentar WHERE idkomentar = $1 RETURNING *`, [
      id,
    ]);
    res.redirect(`/fixtures/${idk}`);
      
   }  
);

app.get(
  "/fixtures/admin/:id([0-9]{1,10})",
  requiresAuth(),
  async function (req, res) {
    if(claimEquals("is_admin",false))
    {
      res.status(401).render('error');
    }
    let id = parseInt(req.params.id);
  
    var utakmica = (
      await db.query(
        "select  idutakmica,idtima,idtimb, goltima, goltimb, utakoloid, t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima WHERE idutakmica = $1",
        [id]
      )
    ).rows;
    var utakmica1 = (
      await db.query(
        "select t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb WHERE idutakmica =$1",
        [id]
      )
    ).rows;
    var tekma = utakmica.shift();
    tekma.nazivtimb = utakmica1.shift().nazivtimb;

    var user = null;
    user = req.oidc.user;
    //promjena za tim A
    await db.query(
      "update utakmica SET goltima=null, goltimb=null WHERE idutakmica = $1",
      [id]
    );
    await db.query(
      "update tablica SET golzabijeni=golzabijeni-$1, golprimljeni=golprimljeni-$2 WHERE tim_id = $3",
      [
        tekma.goltima !== null ? tekma.goltima : 0,
        tekma.goltimb !== null ? tekma.goltimb : 0,
        tekma.idtima,
      ]
    );
    //promjena za tim B
    await db.query(
      "update tablica SET golzabijeni=golzabijeni-$1, golprimljeni=golprimljeni-$2 WHERE tim_id = $3",
      [
        tekma.goltimb !== null ? tekma.goltimb : 0,
        tekma.goltima !== null ? tekma.goltima : 0,
        tekma.idtimb,
      ]
    );
    if (tekma.goltima !== null) {
      if (tekma.goltima > tekma.goltimb) {
        await db.query(
          "update tablica SET bodovi=bodovi-3 WHERE tim_id = $1",
          [tekma.idtima]
        );
      } else if (tekma.goltima < tekma.goltimb) {
        await db.query(
          "update tablica SET bodovi=bodovi-3 WHERE tim_id = $1",
          [tekma.idtimb]
        );
      } else {
        await db.query(
          "update tablica SET bodovi=bodovi-1 WHERE tim_id = $1",
          [tekma.idtima]
        );
        await db.query(
          "update tablica SET bodovi=bodovi-1 WHERE tim_id = $1",
          [tekma.idtimb]
        );
      }
    }

    res.render("edit-fixture", {
      title: "Admin - promjena",
      linkActive: "edit-fixtures",
      utakmica: tekma,
      utaid: id,
      user: user,
    });
  }
  
);

app.get(
  "/fixtures/admin/cancel/:id([0-9]{1,10})/:idk([0-9]{1,10})", 
  requiresAuth(),
  async function (req, res) {
    if(claimEquals("is_admin",false))
    {
      res.status(401).render('error');
    }
    let id = parseInt(req.params.id);
    let idk = parseInt(req.params.idk);
    
    
    var utakmica = (
      await db.query(
        "select  idutakmica,idtima,idtimb, goltima, goltimb, utakoloid, t1.nazivtim as nazivtima FROM utakmica uta INNER JOIN tablica t1 on t1.tim_id = uta.idtima WHERE idutakmica = $1",
        [id]
      )
    ).rows;
    var utakmica1 = (
      await db.query(
        "select t1.nazivtim as nazivtimb from utakmica uta inner join tablica t1 on t1.tim_id = uta.idtimb WHERE idutakmica =$1",
        [id]
      )
    ).rows;
    var tekma = utakmica.shift();
    tekma.nazivtimb = utakmica1.shift().nazivtimb;

    var user = null;
    user = req.oidc.user;
    //promjena za tim A
    await db.query(
      "update utakmica SET goltima=null, goltimb=null WHERE idutakmica = $1",
      [id]
    );
    await db.query(
      "update tablica SET golzabijeni=golzabijeni-$1, golprimljeni=golprimljeni-$2 WHERE tim_id = $3",
      [
        tekma.goltima !== null ? tekma.goltima : 0,
        tekma.goltimb !== null ? tekma.goltimb : 0,
        tekma.idtima,
      ]
    );
    //promjena za tim B
    await db.query(
      "update tablica SET golzabijeni=golzabijeni-$1, golprimljeni=golprimljeni-$2 WHERE tim_id = $3",
      [
        tekma.goltimb !== null ? tekma.goltimb : 0,
        tekma.goltima !== null ? tekma.goltima : 0,
        tekma.idtimb,
      ]
    );
    if (tekma.goltima !== null) {
      if (tekma.goltima > tekma.goltimb) {
        await db.query(
          "update tablica SET bodovi=bodovi-3 WHERE tim_id = $1",
          [tekma.idtima]
        );
      } else if (tekma.goltima < tekma.goltimb) {
        await db.query(
          "update tablica SET bodovi=bodovi-3 WHERE tim_id = $1",
          [tekma.idtimb]
        );
      } else {
        await db.query(
          "update tablica SET bodovi=bodovi-1 WHERE tim_id = $1",
          [tekma.idtima]
        );
        await db.query(
          "update tablica SET bodovi=bodovi-1 WHERE tim_id = $1",
          [tekma.idtimb]
        );
      }
    }

    res.redirect(`/fixtures/${idk}`);
  }
  
);

app.post(
  "/fixtures/admin/:id([0-9]{1,10})/:idkolo([0-9]{1,10})",
  requiresAuth(),
  async function (req, res) {
    if(claimEquals("is_admin",false))
    {
      res.status(401).render('error');
    }
    let idut = parseInt(req.params.id);
    let idk = parseInt(req.params.idkolo);
    let gola = parseInt(req.body.golovitima);
    let golb = parseInt(req.body.golovitimb);
   
    //promjena u tablici utakmica
    await db.query(
      "update utakmica SET goltima=$1, goltimb=$2 WHERE idutakmica = $3",
      [req.body.golovitima, req.body.golovitimb, idut]
    );
    let timA = (
      await db.query("select idtima from utakmica where idutakmica = $1", [
        idut,
      ])
    ).rows.shift();
    let timB = (
      await db.query("select idtimb from utakmica where idutakmica = $1", [
        idut,
      ])
    ).rows.shift();
    //promjena za tim A
    await db.query(
      "update tablica SET golzabijeni=golzabijeni+$1, golprimljeni=golprimljeni+$2 WHERE tim_id = $3",
      [gola, golb, timA.idtima]
    );
    //promjena za tim B
    await db.query(
      "update tablica SET golzabijeni=golzabijeni+$1, golprimljeni=golprimljeni+$2 WHERE tim_id = $3",
      [golb, gola, timB.idtimb]
    );

    if (gola > golb) {
      await db.query("update tablica SET bodovi=bodovi+3 WHERE tim_id = $1", [
        timA.idtima,
      ]);
    } else if (gola < golb) {
      await db.query("update tablica SET bodovi=bodovi+3 WHERE tim_id = $1", [
        timB.idtimb,
      ]);
    } else {
      await db.query("update tablica SET bodovi=bodovi+1 WHERE tim_id = $1", [
        timA.idtima,
      ]);
      await db.query("update tablica SET bodovi=bodovi+1 WHERE tim_id = $1", [
        timB.idtimb,
      ]);
    }
    res.redirect(`/fixtures/${idk}`);
  }
  
);
/****************************** E N D    O F     R  O  U  T  E  S *********************************************************************************/
console.log("server started.....");
if (externalUrl) {
  const hostname = "127.0.0.1";
  app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from
    outside on ${externalUrl}`);
  });
} else {
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}