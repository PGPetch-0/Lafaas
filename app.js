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
const colordiff = require('color-difference');
const GeoPoint = require('geopoint');
const token_secret = 'yvMFMf1PVjHxtjSKAYmMvqCqVenaMDYG';

//some variable setups
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( {extended: true} ));
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

app.post('/registeritem', (req,res) =>{ // upload picture left
    //query all fields
    var item_name = req.body.item_name;
    var location_lat = req.body.location_lat;
    var location_long = req.body.location_long;
    var location_desc = req.body.location_desc;
    var category = req.body.category; 
    var description = req.body.description;
    //color for 2nd table
    var colors = req.body.color; // needs to be array of color
    //variables for Items_found
    var type;
    var img_url;
    var device_token;
    // var date_added = new Date().toISOString().slice(0, 10); // new Date() will give current date
    // console.log(date_added);
    if(colors.length == 0){
        res.send('color missing');
    }
    if(req.body.type == 'found' ){
        img_url = req.body.url;
        type = 0; //freshly registered item will always have type found. Cannot be reserved or claimed.
        device_token = req.body.device_token;
    }

    //insert according to type
    if(req.body.type == 'lost'){
        if(color.length >2) res.send("There can be at most 2 colors!");
        var qrystr = "INSERT INTO `Items_lost`(item_name, location_lat, location_long, location_desc, description, category) VALUES('" + item_name + "', " +location_lat+", " +location_long+",'" + location_desc+"', '"+description+"', '" +category +"')";
        connection.query(qrystr,
            function(err,results){
                if(err) console.log(err);
                getItemLostID(function(item_id){
                    connection.query("INSERT INTO `Items_lost_color` (item_id, color) VALUES (?, ?)", [item_id, colors[0]], function(err,results){
                        if(err) console.log(err);
                        console.log("color1 got called");
                    })
                    if(colors.length==2){
                        connection.query("INSERT INTO `Items_lost_color` (item_id, color) VALUES (?, ?)", [item_id, colors[1]], function(err,results){
                            if(err) console.log(err);
                            console.log("color2 got called");
                        })
                    }
                    var str = "?category=" + category + "&type=" + req.body.type + "&color11=" + req.body.colors[0];
                    if(colors.length>=2) str += "&color12=" + req.body.colors[1];
                    if(req.body.type=="lost") str += "&item_id=" + item_id;
                    res.redirect("/match"+str);
                })
            }
        );
    }else if(req.body.type == 'found'){
        var qrystr2 = "INSERT INTO `Items_found`(item_name, location_lat, location_long, location_desc, description, category, type, image_url, device_token) VALUES (?,?,?,?,?,?,?,?,?)";
        var qryarr = [item_name, location_lat, location_long, location_desc, description, category, 0, img_url, device_token];
        connection.query(
           qrystr2, qryarr,
            function(err,results){
                if(err) console.log(err);
                getItemFoundID(function(item_id){
                    var i;
                    for(i=0; i<colors.length; i++){
                        connection.query("INSERT INTO `Items_found_color` (item_id, color) VALUES (?, ?)", [item_id, colors[i]], function(err,results){
                            if(err) console.log(err);
                            console.log("color got called: " +i);
                        })
                    }
                    var str = "?category=" + category + "&type=" + req.body.type + "&color11=" + req.body.colors[0];
                    if(colors.length>=2) str += "&color12=" + req.body.colors[1];
                    if(req.body.type=="lost") str += "&item_id=" + item_id;
                    res.redirect("/match"+str);
                })
                
            }
        );
    }else{
        res.send('type parameter error');
    }

    //redirect to match
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

//Matching system, req with (category, type, color11, color12(optional), item_id(for case lost))
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
        console.log("filtered by color arr:", resultArr); 
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
                executeMatching(req.query.color11,req.query.color12,founds,results).then(async (filteredArr) =>{
                    let sortedResult = await sortByDistance(req.query.item_id,filteredArr);
                    console.log("final matching result for case lost: \n",sortedResult)
                    res.send(sortedResult)
                })
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
async function distanceCal(lost_id,arr){ 
    console.log(arr)
    const lostQueryPromise = connection.promise().query(`SELECT * FROM Items_lost WHERE item_id=${lost_id}`);
    const [lost_items,lostfields] = await lostQueryPromise;
    const geopoint_lost = new GeoPoint(Number(lost_items[0].location_lat),Number(lost_items[0].location_long));
    var resultArr =[];
    arr.forEach(function(item){
        let geopoint_found = new GeoPoint(Number(item.latitude),Number(item.longitude)); //attribute name for lat and long are changed here, check with  
        let distance = geopoint_lost.distanceTo(geopoint_found, inKilometers = true)*1000;
        let found_item_with_distance = {...item, distance}
        resultArr = [...resultArr, found_item_with_distance]
    })

    return resultArr
}

async function sortByDistance(lost_id,arr){
    const distancefromLost = await distanceCal(lost_id,arr)
    distancefromLost.sort((a,b)=> a.distance-b.distance)
    console.log(distancefromLost)
    return distancefromLost
}

app.post('/msgHardware', (req, res) => {
    const message = req.body
    console.log(message)
    res.set_head
    res.send(message)
})

let scanInterval = {};

app.get('/requestQRdata', (req, res) => { //for frontend client
    const item_id = req.query.item_id;
    const device_token = req.query.device_token;
    const type = req.query.type;
    const item_current_location = req.query.item_current_location;

    res.on('finish', () => {
        const timer = setTimeout(() =>{
            console.log(`Timer is end ${device_token}`)
            delete scanInterval[device_token]
        }, 3600000);
        scanInterval[device_token] = timer;
    });

    const module_ID = 'ENG101' //getModuleID(item_current_location)
    const timestamp = Date.now();
    const QRdata = { "type": type,"moduleID": module_ID, "itemID": item_id, "location": item_current_location, "deviceToken": device_token, "TimeStamp": timestamp }
    res.json(QRdata);
})

app.get('/informClient', (req, res) => { //for hardware
    const token = req.query.token; //noti_token
    const msgfromHardware = req.query.msg;
    const module_id= req.query.module_id;
    const type = req.query.type;
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    switch (msgfromHardware) {
        case `stopTimer`:
            if (scanInterval[token]) { //timer is running
                clearTimeout(scanInterval[token]); //stop then delete
                delete scanInterval[token];
                console.log('QRisValid: '+token)
                if (type === 'found'){
                    //noti user[token] `module: ${module_id} is opened`
                    console.log('Open module ' + module_id)
                    res.json({'openModule': module_id, 'type': type, 'device_token': token});
                }
                else if(type === 'lost'){
                    //noti[token] 'scanFinger'
                    res.json({'scanFingerprint': token, 'openModule': module_id, 'type': type })
                }
            } else { //timeout or invalid
                //noti user[token] QrExpire
                res.send('ExpireNotiSentTo: '+token);
            }
        break;
        case 'WrongStation':
                //noti user[token] WrongStation
                res.send('WrongStationNotiSentTo: '+token) 
        break;
        case 'QrExpire':
                //noti user[token] QrExpire
                res.send('ExpireNotiSentTo: '+ token) 
        break;
        case 'moduleClosed':
            if (type === 'found'){
                //update vacancy
                    // let sql = `INSERT INTO Stores `
                    // connection.query()
                //update store
            }
            if (type === 'lost'){
                //update vacancy
                    // let sql = `INSERT INTO Stores `
                    // connection.query()
                //update store
                //change item type=> claimed
            }
            res.send('SuccessNotiSentTo: '+ token) // updated vacancy status
        break;
        case 'cancelClaim': //need fix wrong algo: client send this not hardware 
                //change item type=> registered
                res.send('ClaimCancelNotiSentTo: '+ token) 
        break;
        default:
                res.send('Invalid Message')
            break;
    }
    
})

app.post('/uploadFingerprint', (req,res)=>{
    const fingerprint = req.body.fingerprint;
    const module_id = req.body.module_id;
    const type = req.body.type;
    const device_token = req.body.device_token;
    //upload fingerprint
    const record= true; //success store fingerprint
    //if(err) throw err
    if (record){
        console.log('Open module ' + module_id)
        res.json({'openModule': module_id, 'type': type, 'device_token': device_token});
    }
})

/*
async function requestQRdata(itemID, personID, type, item_current_location) {
    const module_ID = 'ENG101'
    const timestamp = Date.now();
    const QRdata = { "moduleID": module_ID, "itemID": itemID, "location": item_current_location, "deviceToken": token, "TimeStamp": timestamp }
    return QRdata;
}

async function getData(itemID, type) {
    if (type === 'found') {
        const moduleID = "ENG101" //placehold for test require query and module selection
        const sql = `select device_token from Items_found where item_id=${itemID}`
        const queryPromise = connection.promise().query(sql)
        const [items, fields] = await queryPromise
        const ret = { "ModuleID": moduleID, "device_token": items[0].device_token }
        return ret
    }
}
*/

http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Listening');
});

function getMaxPid(callback) {
    connection.query("SELECT MAX(pid) AS max_pid FROM `Persons`", function (err, rows, fields) {
        if (err) console.log(err);
        callback(rows[0].max_pid);
    })
}

function getItemLostID(callback) {
    connection.query("SELECT MAX(item_id) AS max_item_id FROM `Items_lost`", function (err, rows, fields) {
        if (err) console.log(err);
        callback(rows[0].max_item_id);
    })
}

function getItemFoundID(callback) {
    connection.query("SELECT MAX(item_id) AS max_item_id FROM `Items_found`", function (err, rows, fields) {
        if (err) console.log(err);
        callback(rows[0].max_item_id);
    })
}
