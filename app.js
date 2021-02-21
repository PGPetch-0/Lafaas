const app = require('express')();
const http = require('http').createServer(app);
const { Expo } = require('expo-server-sdk');
const mysql = require('mysql2');
const expo = new Expo();

app.get('/', (req, res) => {
    res.send(req.headers['x-forwarded-for'] + " eiei");
})

app.get('/noti', (req, res) => {

    const chunks = expo.chunkPushNotifications([
        { to: "ExponentPushToken[qPdMFxC5qgVRvhvSPm-XMn]", sound: "default", body: req.query.msg }
    ]);

    for (let each of chunks) {
        expo.sendPushNotificationsAsync(each)
    }

    res.send("Done");
})

app.get('/db', (req, res) => {

    let connection = mysql.createConnection({
        host: "db-mysql-sgp1-71945-do-user-8609677-0.b.db.ondigitalocean.com",
        user: "doadmin",
        password: "dwe606qmttxyj0ow",
        database: "defaultdb",
        port: "25060"
    });

    connection.query(
        'SELECT * FROM `Persons`',
        function (err, results, fields) {
            //res.send(results); // results contains rows returned by server
            res.send(fields); // fields contains extra meta data about results, if available
        }
    );
})


http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});