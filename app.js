const app = require('express')();
const http = require('http').createServer(app);
const { Expo } = require('expo-server-sdk');
const mysql = require('mysql2');
const expo = new Expo();
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const upload = multer({
    storage: multerS3({
        s3: new AWS.S3({
            endpoint: new AWS.Endpoint('nyc3.digitaloceanspaces.com'),
            accessKeyId: 'C7RMAXBJ5FFM7XVT2E5E',
            secretAccessKey: 'Nde/mtwFsgfo/EwBsviLTLmn+3MOWfADjuCabko9INE'
        }),
        bucket: 'lafaas-spaces',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            console.log("Uploaded file " + file.originalname);
            cb(null, file.originalname); //use Date.now().toString() for unique file keys
        }
    })
});

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
        host: "lafaas-db-do-user-8735555-0.b.db.ondigitalocean.com",
        user: "doadmin",
        password: "wmvyr6bjdsp1nv3w",
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

app.post('/upload', upload.array('photo', 1), function (req, res, next) {
    res.send("Upload success");
});


http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});