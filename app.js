//imported stuff
const app = require('express')();
const http = require('http').createServer(app);
const { Expo } = require('expo-server-sdk');
const mysql = require('mysql2');
const expo = new Expo();
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

//some variable setups
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
let connection = mysql.createConnection({
    host: "lafaas-db-do-user-8735555-0.b.db.ondigitalocean.com",
    user: "doadmin",
    password: "wmvyr6bjdsp1nv3w",
    database: "defaultdb",
    port: "25060"
});

app.get('/', (req, res) => {
    res.send(req.headers['x-forwarded-for'] + " eiei");
});

app.get('/noti', (req, res) => {

    const chunks = expo.chunkPushNotifications([
        { to: "ExponentPushToken[qPdMFxC5qgVRvhvSPm-XMn]", sound: "default", body: req.query.msg }
    ]);

    for (let each of chunks) {
        expo.sendPushNotificationsAsync(each)
    }

    res.send("Done");
});

app.get('/db', (req, res) => {
    connection.query(
        'SELECT * FROM `Persons`',
        function (err, results, fields) {
            res.send(results); // results contains rows returned by server
            //res.send(fields); // fields contains extra meta data about results, if available
        }
    );
});

app.get('/insertdb', (req,res) =>{
    connection.query(
        'INSERT INTO Persons VALUES (\'0\', \'user0\', \'pass0\', \'example@gmail.com\', \'first\', \'last\')',
        function(err,results){
            console.log('inserted');
        }
    );
});


app.post('/upload', upload.array('photo', 1), function (req, res, next) {
    res.send("Upload success");
});

//Item Listing System Methods

//Item Reg
app.get('/item_reg', (req, res) => {
    connection.query("SELECT JSON_ARRAYAGG(JSON_OBJECT('name', item_name, 'item_id', item_id, 'location', location_desc, 'color', color, 'description', description, 'image', image_url)) AS 'Registered' FROM Items_found WHERE type = 0", function(err, results) {
        if (err) throw err;
        res.json(results);
    });
});
//Item Claimed
app.get('/item_claimed', (req, res) => {
    connection.query("SELECT JSON_ARRAYAGG(('name', item_name, 'item_id', item_id, 'location', location_desc, 'color', color, 'description', description, 'image', image_url))  AS 'Claimed' FROM Items_found WHERE type = 1", function(err, results) {
        if (err) throw err;
        res.json(results);
    });
});


http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});
