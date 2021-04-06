//imported stuff
const app = require('express')();
const http = require('http').createServer(app);
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const mysql = require('mysql2');
const expo = new Expo();
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const jwt = require('jsonwebtoken');
const { callbackify } = require('util');
const { query } = require('express');
const token_secret = 'yvMFMf1PVjHxtjSKAYmMvqCqVenaMDYG';
const colordiff = require('color-difference');
const GeoPoint = require('geopoint');
const { count } = require('console');
const { TemporaryCredentials } = require('aws-sdk');

//some variable setups
app.use(bodyParser.json());
app.use(require('express').urlencoded());
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
}).array('upload', 1);

let connection = mysql.createConnection({
    host: "lafaas-db-do-user-8735555-0.b.db.ondigitalocean.com",
    user: "doadmin",
    password: "wmvyr6bjdsp1nv3w",
    database: "defaultdb",
    port: "25060"
});

function generateToken(user) {
    return jwt.sign({ username: user }, token_secret);
}

//****MAIN METHODS (frontend will call this) ****
app.get('/', (req, res) => {
    //res.send(req.headers['x-forwarded-for'] + " eiei");
    if (req.query.token != 'undefined') {
        jwt.verify(req.query.token, token_secret, (err, result) => {
            if (err) {
                return res.status(400).send('unauthenticated user');
            }
            res.send('authenticated user: ' + result['username']);
        });
    }
});

app.get('/registeritem', (req, res) => { // upload picture left
    //query all fields
    var item_name = req.query.item_name;
    var location_lat = req.query.location_lat;
    var location_long = req.query.location_long;
    var location_desc = req.query.location_desc;
    var category = req.query.category;
    var description = req.query.description;
    //color for 2nd table
    var color1 = req.query.color1;
    var color2 = req.query.color2;
    //variables for Items_found
    var type;
    var img_url;
    var device_token;
    // var date_added = new Date().toISOString().slice(0, 10); // new Date() will give current date
    // console.log(date_added);
    if (color1 == null) {
        console.log('color1 missing');
        res.send('color1 is required');
    }
    if (req.query.type == 'found') {
        img_url = req.query.url;
        type = 0;
        device_token = req.query.device_token;
    }

    //insert according to type
    if (req.query.type == 'lost') {
        //var qrystr = "INSERT INTO 'Items_lost' SET item_name = '" + item_name + "', location_lat = " + location_lat + ", location_long = " + location_long + ", location_desc = '"+location_desc+"', description = '"+description+"', category = '" + category+"'";
        var qrystr = "INSERT INTO 'Items_lost' SET item_name=?, location_lat=?, location_long=?, location_desc=?, description=?, category=?";
        var qryarr = [item_name, location_lat, location_long, location_desc, description, category];
        //var qrystr = "INSERT INTO 'Items_lost' (item_name, location_lat, location_long, location_desc, description, category) VALUES ('" + item_name + "', " +location_lat+", " +location_long+",'" + location_desc+"', '"+description+"', '" +category +"')";
        //connection.query("INSERT INTO 'Items_lost' (item_name, location_lat, location_long, location_desc, description, category) VALUES (?, ?, ?, ?, ? ,?)", [item_name, location_lat, location_long, location_desc, description, category],
        connection.query(qrystr, qryarr,
            function (err, results) {
                if (err) console.log(err);
                getItemID(function (item_id) {
                    connection.query("INSERT INTO 'Items_lost_color' (item_id, color) VALUES (?, ?)", [item_id, color1], function (err, results) {
                        if (err) console.log(err);
                        console.log("color1 got called");
                    })
                    if (color2 != null) {
                        connection.query("INSERT INTO 'Items_lost_color' (item_id, color) VALUES (?, ?)", [item_id, color2], function (err, results) {
                            if (err) console.log(err);
                            console.log("color2 got called");
                        })
                    }
                    res.send("Check everything");
                })
                // connection.query("SELECT MAX(item_id) AS max_item_id FROM `Item_lost`", function(err,results ){
                //     if(err) console.log(err);
                //     console.log(results);
                //     console.log("lost id got called");
                //     connection.query("INSERT INTO 'Item_lost_color' (item_id, color) VALUES ('" + results[0].max_item_id + "', '" + color1 +"')", function(err,result){
                //         console.log("color got called");
                //     })
                //     if(color2!=null){
                //         connection.query("INSERT INTO 'Item_lost_color' (item_id, color) VALUES (?, ?)", [results[0].max_item_id, color2], function(err,result){
                //             console.log("color2 got called");
                //         })
                //     }
                //     res.send("check logs and database");
                // })
            }
        );
    } else if (req.query.type == 'found') {
        connection.query(
            "",
            function (err, results) {
                if (err) {
                    console.log(err);
                    res.send(err);
                } else {
                    console.log('inserted found item');
                    res.send('inserted found item');
                }
            }
        );
    } else {
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

app.post('/createuser', (req, res) => {
    connection.query("SELECT * FROM Persons WHERE username = '" + req.body.user + "' ORDER BY username LIMIT 1", function (err, results, fields) {
        if (err) {
            console.log(err);
        } if (results.length > 0) {
            res.json({
                code: 0,
                message: 'User already exists'
            })
        } else {
            connection.query("INSERT INTO Persons(username,password,email,f_name,l_name, noti_token) VALUES ('" + req.body.user + "', '" + req.body.pass + "', '" + req.body.email + "', '" + req.body.fname + "', '" + req.body.lname + "', '" + req.body.noti_token + "')",
                function (err, results) {
                    res.json({
                        code: 1,
                        message: 'Success',
                        token: generateToken(req.body.user)
                    })
                });
        }
    });
});

app.post('/login', (req, res) => {
    let user = req.body.user;
    let pass = req.body.pass;
    let find = "SELECT username,password FROM Persons WHERE username='" + user + "'";
    connection.query(find, function (err, results) {
        if (err) {
            console.log(err);
            return;
        }
        if (results.length === 0) {
            res.json({
                code: 0,
                message: 'User not found'
            })
        } else if (results[0].password === pass) {
            res.json({
                code: 1,
                message: 'Successful login',
                token: generateToken(user)
            })
        } else {
            res.json({
                code: 2,
                message: 'Unsuccessful login'
            })
        }
    })
});

//upload picture (need to be from input "file" in html)
app.post('/upload', function (request, response, next) {
    upload(request, response, function (error) {
        if (error) {
            console.log(error);
        }
        console.log('File uploaded successfully.');
    });
});

//***ADMINISTATION (backend only)***
app.get('/db', (req, res) => { // used to check content of table
    // var id = [];
    // console.log("1st id: "+ id[0]);
    // connection.query(
    //     "SELECT MAX(pid) AS max_pid FROM `Persons`", // change table name to the one you want to check
    //     function (err, rows, fields) {
    //         if(err) console.log(err);
    //             console.log("query got executed");
    //             console.log(rows);
    //             id.push(rows[0].max_pid);
    //             res.send("check logs"); // results contains rows returned by server
    //             callback(null);
    //         //res.send(fields); // fields contains extra meta data about results, if available
    //     }
    // );
    // console.log("after query got executed");
    // console.log("2nd id: " + id[0]);
    getMaxPid(function (pid) {
        console.log(pid);
        res.send("check logs!!!");
    })
});

///Item Listing System Methods

//Item Reg
app.get('/item_reg', (req, res) => {
    connection.query("SELECT JSON_ARRAYAGG(JSON_OBJECT('name', item_name, 'item_id', item_id, 'location', location_desc, 'color', color, 'description', description, 'image', image_url)) AS 'Registered' FROM Items_found WHERE type = 0 AND device_token != '" + req.query.token + "' ORDER BY date_added ASC", function (err, results) {
        if (err) throw err;
        res.json(results[0]);
    });
});

//Item Claimed
app.get('/item_claimed', (req, res) => {
    connection.query("SELECT JSON_ARRAYAGG(JSON_OBJECT('name', item_name, 'item_id', item_id, 'location', location_desc, 'color', color, 'description', description, 'image', image_url))  AS 'Claimed' FROM Items_found WHERE type = 1 ORDER BY date_added ASC", function (err, results) {
        if (err) throw err;
        res.json(results[0]);
    });
});

//Matching system
app.get('/match', (req, res) => {
    var losts = []
    var founds = []

    function appendItems(arr, items) {
        arr = items.map(item => Object.values(item)[0]);
        console.log(arr); //not mandatory
        return arr;
    }

    async function executeMatching(color11,color12,type,results){
        let arr = appendItems(type,results);
        let colorCalculated = await getColorRes(arr,color11,color12);
        //criteria for color difference is set to <= 40 but can be altered later on
        let resultArr = colorCalculated.filter(item => item.colorDiff <= 40);
        console.log(resultArr); 
        return resultArr; 
    }

    if (req.query.type == 'found') { //condition1 = item found registered => generate notification
        //x = registered found item's category
        connection.query("SELECT (JSON_OBJECT('name', Items_lost.item_name, 'item_id', Items_lost.item_id, 'latitude', Items_lost.location_lat, 'longitude', Items_lost.location_long, 'location', Items_lost.location_desc, 'description', Items_lost.description, 'color', Items_lost_color.color)) FROM Items_lost, Items_lost_color WHERE category=? AND Items_lost.item_id = Items_lost_color.item_id", [req.query.category], function(err, results) {
            if (err) {
                throw err;
            } else {
                executeMatching(req.query.color11,req.query.color12,losts,results);
            }
        });
    }
    else if (req.query.type == 'lost') { //condition2 = item lost registered => query to show potential matches
        //y = registered lost item's category
        connection.query("SELECT (JSON_OBJECT('name', Items_found.item_name, 'item_id', Items_found.item_id, 'latitude', Items_found.location_lat, 'longitude', Items_found.location_long, 'location', Items_found.location_desc, 'description', Items_found.description, 'color', Items_found_color.color)) FROM Items_found, Items_found_color WHERE category=? AND Items_found.item_id = Items_found_color.item_id", [req.query.category], function(err, results) {
            if (err) {
                throw err;
            } else {
                executeMatching(req.query.color11,req.query.color12,founds,results);
            }
        });
    }
});

//Color difference; only color11 and color21 are mendatory. 11 means first color from first item and 21 is first color from second item.
function colorDifference(color11,color12,color21,color22){
    if (typeof color12 == 'undefined' && typeof color22 == 'undefined') {
        return(colordiff.compare(color11, color21));
    } else if (typeof color12 == 'undefined' || typeof color22 == 'undefined') {
        if (typeof color12 == 'undefined') {
            let v1 = colordiff.compare(color11, color21);
            let v2 = colordiff.compare(color11, color22);
            return(v1 < v2 ? v1 : v2);
        } else if (typeof color22 == 'undefined') {
            let v1 = colordiff.compare(color11, color21);
            let v2 = colordiff.compare(color12, color21);
            return(v1 < v2 ? v1 : v2);
        }
    } else {
        let v1 = colordiff.compare(color11, color21);
        let v2 = colordiff.compare(color11, color22);
        let v3 = colordiff.compare(color12, color21);
        let v4 = colordiff.compare(color12, color22);
        return(Math.min(v1, v2, v3, v4));
    }
}

async function getColorRes(arr,color11,color12) {
    arr.forEach((item) => {
        let colors = [];
            arr.forEach((item2) => {
                if(item2.item_id == item.item_id)
                    colors.push(item2.color);
            });
        let diff = colorDifference(color11,color12,colors[0],colors[1]);
        Object.assign(item, {'colorDiff':diff});
    });
    console.log(arr);
    return arr;
}

//get distance from item_lost to every item found
app.get('/distanceCal', (req, res) => {
    const lost_id = req.query.lost_id
    connection.query(
        `SELECT location_lat,location_long FROM Items_lost WHERE item_id=${lost_id}`, // change table name to the one you want to check
        function (err, results, fields) {
            if (err) throw err;
            const lost_item = results[0]
            connection.query('SELECT item_id,location_lat,location_long FROM Items_found', (err, results, fields) => {
                if (err) throw err;
                var geopoint_lost = new GeoPoint(Number(lost_item.location_lat), Number(lost_item.location_long));
                var geopoint_found;
                var res_msg = { "lost_id": Number(lost_id) };
                results.forEach(function (result) {
                    console.log("item_id: " + result.item_id)
                    geopoint_found = new GeoPoint(Number(result.location_lat), Number(result.location_long));
                    distance = geopoint_lost.distanceTo(geopoint_found, inKilometers = true) * 1000
                    res_msg[`found_id${result.item_id}`] = distance;
                })
                res.send(res_msg);
            })
        });
});


app.post('/msgHardware',(req,res)=>{
    const message = req.body
    console.log(message)
    res.send(message)
})


http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});

function getMaxPid(callback) {
    connection.query("SELECT MAX(pid) AS max_pid FROM `Persons`", function (err, rows, fields) {
        if (err) console.log(err);
        callback(rows[0].max_pid);
    })
}

function getItemID(callback) {
    connection.query("SELECT MAX(item_id) AS max_item_id FROM 'Item_lost'", function (err, rows, fields) {
        if (err) console.log(err);
        callback(rows[0].max_item_id);
    })
}
