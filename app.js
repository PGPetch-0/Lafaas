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

//****MAIN METHODS (frontend will call this) ****
app.get('/', (req, res) => {
    res.send(req.headers['x-forwarded-for'] + " eiei");
});

app.get('/registeritem', (req,res) =>{
    //query all fields
    var item_name = req.query.item_name;
    var location_lat = req.query.location_lat;
    var location_long = req.query.location_long;
    var location_desc = req.query.location_desc;
    var category = req.query.category;
    var color = req.query.color;
    var description = req.query.description;
    //variables for Items_found
    var type;
    var img_url;
    var current_location = 'undefined'; // storage location aka locker or faculty. When it's still in finder's possession, it will be labeled as undefined.
    var in_locker = 0; //0=false 1=true
    var date_added = new Date().toISOString().slice(0, 10); // new Date() will give current date
    console.log(date_added);
    if(req.query.type == 'found' ){
        img_url = req.query.url;
        type = 0;
    }
    //insert according to type
    if(req.query.type == 'lost'){
        connection.query(
            "INSERT INTO Items_lost(item_name,location_lat, location_long, location_desc, category, color, description) VALUES('"
            +item_name+"',"+ location_lat+"," +location_long+",'" +location_desc+"','" +category+"','" +color+"','" +description+"')",
            function(err,results){
                if(err){
                    console.log(err);
                    res.send(err);
                }else{
                    console.log('inserted lost item');
                    res.send('inserted lost item');
                }
            }
        );
    }else if(req.query.type == 'found'){
        connection.query(
            "INSERT INTO Items_found(item_name, location_lat, location_long, location_desc, category, color, description, type, image_url, current_location, in_locker, date_added) VALUES('"
            + item_name +"'," + location_lat+"," +location_long+",'" +location_desc+"','" +category+"','" +color+"','" +description+"',0,'"+img_url+"','undefined',0,'"+date_added+"')",
            function(err,results){
                if(err){
                    console.log(err);
                    res.send(err);
                }else{
                    console.log('inserted found item');
                    res.send('inserted found item');
                }
            }
        );
    }else{
        res.send('type parameter error');
    }

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

app.get('/createuser', (req,res) =>{
    //get user, pass, email, first, last
    connection.query("SELECT 1 FROM Persons WHERE username = '"+req.query.user+"' ORDER BY username LIMIT 1", function (err, results, fields) {
        if (err) {
            console.log(err);
        }if (results.length>0) {
            console.log(results);
            console.log('fail');
            res.send("user already exists");
        } else {
            console.log('insert');
            connection.query("INSERT INTO Persons(username,password,email,f_name,l_name) VALUES ('"+req.query.user+"', '"+req.query.pass+"', '"+req.query.email+"', '"+req.query.fname+"', '"+req.query.lname+"')",
            function(err,results){
            console.log(req.query.user);
            });
        }
    });
});

app.get('/login', (req,res) =>{
    //get user, pass
    let user=req.query.user;
    let pass=req.query.pass;
    let find = "SELECT username,password FROM Persons WHERE username='"+user+"'";
    connection.query(find, function(err, results){
        if(err){
            console.log(err);
            return;
        } 
        if(results[0].password==pass){
            res.send("successful login");
        }else{
            res.send("wrong password");
        }
    })
});

app.get('/registeritem', (req,res) =>{
    
});

//***ADMINISTATION (backend only)***
app.get('/db', (req, res) => { // used to check content of table
    connection.query(
        'SELECT * FROM `Persons`', // change table name to the one you want to check
        function (err, results, fields) {
            res.send(results); // results contains rows returned by server
            //res.send(fields); // fields contains extra meta data about results, if available
        }
    );
});


http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});