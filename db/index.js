require('dotenv').config();
const {Pool} = require('pg');

const pool = new Pool({
    user: "web2_user",
    host: process.env.DB_HOST,
    database: 'web2_lab1',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl : true
    })

module.exports = {
    query: (text, params) => {
        const start = Date.now();
        return pool.query(text, params)
            .then(res => {
                const duration = Date.now() - start;
                console.log('executed query', {text, params, duration, rows: res.rows});
                return res;
            });
    }
}
