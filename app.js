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
const stringSimilarity = require('string-similarity');

let qrAvailable = {};
/* 
{
   {
  1 : {
    type: 'lost',
    moduleID: 'ENG101',
    itemID: 1,
    location: 'ENG1',
    deviceToken: 'test',
    timestamp: 1618725018469,
    Scaninterval: null
  }
}
*/

//some variable setups
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( {extended: true} ));
const upload = multer({
    storage: multerS3({
        s3: new AWS.S3({
            endpoint: new AWS.Endpoint('sgp1.digitaloceanspaces.com'),
            accessKeyId: 'IYPRQHXRZWAWAGESDSXF',
            secretAccessKey: 'dRxJKmHGgBckszvs70cxWpwf7OfEvX2I/yPWpUFsQd0'
        }),
        bucket: 'lafaas-space',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, next) => {
            next(null, Date.now() + '_' + file.originalname);
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

app.post('/registeritem',upload.single('image'),  (req,res) =>{ // upload picture left
    //query all fields
    var item_name = req.body.item_name;
    var location_lat = req.body.location_lat;
    var location_long = req.body.location_long;
    var location_desc = req.body.location_desc;
    var category = req.body.category; 
    var description = req.body.description;
    //color for 2nd table
    var colors = req.body.color.split(','); // sent as string of colors divided by ,
    //variables for Items_found
    var type;
    var device_token;
    // var date_added = new Date().toISOString().slice(0, 10); // new Date() will give current date
    // console.log(date_added);
    if(colors.length == 0){
        res.send('color missing');
    }
    if(req.body.type == 'found' ){
        type = 0; //freshly registered item will always have type found. Cannot be reserved or claimed.
        device_token = req.body.device_token;
    }
        //insert according to type
        if(req.body.type == 'lost'){
            if(colors.length >2) res.send("There can be at most 2 colors!");
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
                        const result = match(item_id,'lost');
                        (async () => {
                            const result = await match(item_id,'lost');
                            console.log("result:",result);
                            res.send(result);
                        })();
                    })
                }
            );
        }else if(req.body.type == 'found'){
            var qrystr2 = "INSERT INTO `Items_found`(item_name, location_lat, location_long, location_desc, description, category, type, image_url, device_token) VALUES (?,?,?,?,?,?,?,?,?)";
            var qryarr = [item_name, location_lat, location_long, location_desc, description, category, 0, req.file.location, device_token];
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
                        (async () => {
                            const result = await match(item_id,'found');
                            console.log("result:",result);
                            if(result.code == 0) {
                                //set timer to one hour, if exceeds, delete entry
                                //res QR data to frontend
                                const qrid = current_qrid
                                getQR(item_id,device_token,'found')
                                .then((qr_id)=>{
                                    res.on('finish', () => {
                                        const timer = setTimeout(() =>{ //timeout remove claim
                                            console.log(`Timer is end for qr_id: ${qrid} NO USER SCAN [FOUND]`)
                                            delete qrAvailable[qr_id]["scanInterval"]
                                            connection.query(`DELETE FROM Items_found_color WHERE item_id = ${qrAvailable[qrid]["itemID"]}`,(err,result)=>{
                                                console.log(`DELETE FROM Items_found_color item_id: ${qrAvailable[qrid]["itemID"]} row deleted: ` + result.affectedRows)
                                                connection.query(`DELETE FROM Items_found WHERE item_id = ${qrAvailable[qrid]["itemID"]}`,(err,result)=>{
                                                    if(err) throw err;
                                                    console.log(`DELETE FROM Items_found item_id: ${qrAvailable[qrid]["itemID"]}`)  
                                                })
                                            })
                                        }, 3600000);
                                        qrAvailable[qr_id]["scanInterval"] = timer
                                    });                
                                    res.send(''+qr_id+','+qrAvailable[qr_id]["timestamp"])
                                }) 
                            }
                        })();
                    })
                }
            );
        }else{
            res.send('type parameter error');
        }
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
                        token: generateToken(req.body.user),
                        name: req.body.user
                    })
                });
        }
    });
});

app.post('/login', (req, res) => {
    let user = req.body.user;
    let pass = req.body.pass;
    let token = req.body.noti_token;
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
            connection.query(`UPDATE Persons SET noti_token='${token}' WHERE username = '${user}'`)
            res.json({
                code: 1,
                message: 'Successful login',
                name: user,
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
//My registered items
app.get('/profile', (req, res) => {
    const token = req.query.token;

    let selection, source, condition, option;
    //Lost Item Query
    selection = "SELECT T.*, GROUP_CONCAT(TC.color SEPARATOR ',') AS color ";
    source = "FROM Items_lost T, Items_lost_color TC, Loses L, Persons P ";
    condition = "WHERE T.item_id = L.item_id AND L.pid = P.pid AND T.item_id = TC.item_id AND P.noti_token = '" + token + "' ";
    option = "GROUP BY item_id";
    const query_lost = selection + source + condition + option;

    //Found Item Query
    selection = "SELECT T.*, GROUP_CONCAT(TC.color SEPARATOR ',') AS color ";
    source = "FROM Items_found T, Items_found_color TC ";
    condition = "WHERE T.item_id = TC.item_id AND T.device_token = '" + token + "' ";
    option = "GROUP BY item_id";
    const query_found = selection + source + condition + option;

    let data = [];
    connection.query(query_lost, (err, result) => {

        result.forEach(e => {
            e.type = 'Lost';
            data.push(e);
        })

        connection.query(query_found, (err, result) => {

            result.forEach(e => {
                e.type = 'Found';
                data.push(e);
            })

            connection.query(`SELECT f_name, l_name FROM Persons WHERE noti_token='${token}'`,(err,results)=>{
                
                res.json({
                        name: results[0].f_name+' '+results[0].l_name,
                        data: data
                });
            })
        })

    })
})

//Item Reg
app.get('/item_reg', (req, res) => {
    const token = req.query.token;

    connection.query("SELECT F.*, GROUP_CONCAT(color SEPARATOR ',') AS color FROM Items_found_color FC, Items_found F WHERE F.item_id = FC.item_id AND type = 0 AND device_token != '"+ token +  "' GROUP BY item_id", (err, result) => {

        res.json(result);

    })
});

//Item Claimed
app.get('/item_claimed', (req, res) => {
    connection.query("SELECT F.*, GROUP_CONCAT(color SEPARATOR ',') AS color FROM Items_found_color FC, Items_found F WHERE F.item_id = FC.item_id AND type = 2 GROUP BY item_id", (err, result) => {
        const resultsWithReportFlag = result.map(item=>{
            let reportable = 1;
            if (item.description.includes('The item is now with faculty Lost and Found')){
                reportable = 0;
            }
            item = {...item, reportable}
            return item
        })
        res.json(resultsWithReportFlag);

    })
});

app.post('/claim',(req, res) => { //type=== 'lost'
    const pid = req.body.pid
    const found_id = req.body.item_id
    const national_id = req.body.national_id
    const tel = req.body.tel
    const qrid = current_qrid 
    connection.query(`SELECT type FROM Items_found WHERE item_id=${found_id}`, (err,result)=>{
        if(result[0].type === 1){
            res.send("Item is reserved, Can't claim this")
        }
        else if(result[0].type === 2){
            res.send("Item is claimed, Can't Claim this")
        }
        else{
            connection.query(`SELECT item_id, module_id,noti_token FROM Stores, Persons WHERE item_id = ${found_id} AND pid = ${pid}`,(err,result)=>{
                if(result.length !== 0 ){
                    connection.query(`INSERT INTO Claims (item_id, national_id, tel, pid) VALUE(${found_id},${national_id},${tel},${pid})`,(err,result)=>{
                        if(err) throw err; 
                        console.log(`CREATE Claims pid: ${pid}, item_id: ${found_id}`)  
                    })
                    connection.query(`UPDATE Items_found SET type = 1 WHERE item_id = ${found_id}`,(err,result)=>{
                        if(err) throw err;
                        console.log(`SET Item_found item_id: ${found_id} from registered --> reserved`) //set type to reserved 
                    })
                }else{
                    res.send(`no found item id: ${found_id} in the database`)
                }
                const storeInfo = result[0] 
                getQR(storeInfo.item_id,storeInfo.noti_token,'lost',storeInfo.module_id)
                .then((qr_id)=>{
                    res.on('finish', () => {
                        const timer = setTimeout(() =>{ //timeout remove claim
                            console.log(`Timer is end for qr_id: ${qrid} NO USER SCAN [LOST]`)
                            delete qrAvailable[qr_id]["scanInterval"]
                            connection.query(`DELETE FROM Claims WHERE item_id = ${qrAvailable[qrid]["itemID"]}`,(err,result)=>{
                                if(err) throw err;
                                console.log(`DELETE FROM Claims item_id: ${qrAvailable[qrid]["itemID"]}`)  
                            })
                            connection.query(`UPDATE Items_found SET type = 0 WHERE item_id = ${qrAvailable[qrid]["itemID"]}`,(err,result)=>{
                                if(err) throw err;
                                console.log(`RESET Item_found item_id: ${qrAvailable[qrid]["itemID"]} from reserved --> registered`) //set type back to registered  
                            })
                        }, 3600000);
                        qrAvailable[qr_id]["scanInterval"] = timer
                    });                
                    res.send(''+qr_id+','+qrAvailable[qr_id]["timestamp"])
                })
            })
        }
    })
})

app.post('/adminclaim', async (req,res)=>{
    const token = req.body.token
    console.log(token)
    const result = jwt.verify(token, token_secret);
    const username = result.username
    const qrid = current_qrid 
    if (username === 'admin'){
        const qr_id = await getQR(0,token,'admin','ALL1');
        res.on('finish', () => {
            const timer = setTimeout(() =>{
                console.log(`Timer is end for qr_id: ${qrid} [ADMIN QR] `)
                delete qrAvailable[qr_id]["scanInterval"]
            }, 3*60*1000);
            qrAvailable[qr_id]["scanInterval"] = timer
        });
        res.send(''+qr_id+','+qrAvailable[qr_id]["timestamp"])
    }else{
        res.send('Unauthorized')
    }
})

//Report
app.get('/report', (req,res) =>{
    const pid = req.query.pid;
    const item_id = req.query.item_id;
    const message = req.query.message;
    const url = req.query.evidence_url;
    var date = new Date().toISOString().slice(0, 10);
    connection.query("INSERT INTO `Reports` (pid, item_id, message, evidence_url, date_reported) VALUES (" + pid + ", '"+item_id+"', '"+message+"', '"+url+"',"+date+")", function(err,result){
        if(err) console.log()
    })
})

//Matching, to be called by registerItem
function match (item_id,type) {
    return new Promise((resolve,reject) => {
            let matchA = [];
            let colorA = [];
        connection.query("SELECT (JSON_OBJECT('name', Items_"+type+".item_name, 'category', Items_"+type+".category, 'item_id', Items_"+type+".item_id, 'latitude', Items_"+type+".location_lat, 'longtitude', Items_"+type+".location_long, 'location', Items_"+type+".location_desc, 'description', Items_"+type+".description, 'color', Items_"+type+"_color.color)) FROM Items_"+type+", Items_"+type+"_color WHERE Items_"+type+".item_id=? AND Items_"+type+".item_id = Items_"+type+"_color.item_id", [item_id], function(err, results) {
            if (err) {
                reject(err);
            } else {
                matchA = results.map(result => Object.values(result)[0]);
                matchA.map(item => colorA.push(item.color))
                matchA.map(item => item.color = colorA);
                matchA.flat();
                const seen = new Set();
                const filteredMatchA = matchA.filter(el => {
                    const duplicate = seen.has(el.id);
                    seen.add(el.id);
                    return !duplicate;
                })
                let type2 = (type == 'lost')? 'found':'lost';
                let qry = (type2 == 'found')? "SELECT (JSON_OBJECT('name', Items_"+type2+".item_name, 'category', Items_"+type2+".category, 'item_id', Items_"+type2+".item_id, 'latitude', Items_"+type2+".location_lat, 'longtitude', Items_"+type2+".location_long, 'location', Items_"+type2+".location_desc, 'description', Items_"+type2+".description, 'color', Items_"+type2+"_color.color, 'image_url', Items_"+type2+".image_url, 'device_token', Items_"+type2+".device_token)) FROM Items_"+type2+", Items_"+type2+"_color WHERE Items_"+type2+".category=? AND Items_"+type2+".item_id = Items_"+type2+"_color.item_id" : 
                "SELECT (JSON_OBJECT('name', Items_"+type2+".item_name, 'category', Items_"+type2+".category, 'item_id', Items_"+type2+".item_id, 'latitude', Items_"+type2+".location_lat, 'longtitude', Items_"+type2+".location_long, 'location', Items_"+type2+".location_desc, 'description', Items_"+type2+".description, 'color', Items_"+type2+"_color.color)) FROM Items_"+type2+", Items_"+type2+"_color WHERE Items_"+type2+".category=? AND Items_"+type2+".item_id = Items_"+type2+"_color.item_id";
                connection.query(qry, matchA[0].category, async function(err, results) {
                    if (err) {
                        reject(err);
                    } else {
                        //match category
                        let matchB = results.map(result => Object.values(result)[0]);
                        matchB.map(a => {
                            let colorTemp = [];
                            colorTemp.push(a.color);
                            a.color = colorTemp;
                        });
                        const arrayHashmap = matchB.reduce((obj, item) => {
                            obj[item.item_id] ? obj[item.item_id].color.push(...item.color) : (obj[item.item_id] = { ...item });
                            return obj;
                        }, {});
                        var mergedArray = Object.values(arrayHashmap);
                        //match color
                        for(item of mergedArray) {
                            let bColor = item.color;
                            let tempArr = [];
                            for(color of filteredMatchA[0].color) {
                                bColor.map(c => {
                                    let diff = colordiff.compare(color,c);
                                    tempArr.push(diff);
                                })
                                let minDiff = Math.min.apply(Math, tempArr.map(function(item) { return item; }))
                                tempArr = tempArr.filter(a => a == minDiff);
                                console.log(tempArr);
                            }
                            let calcDiff = 0;
                            tempArr.map(eachdiff => {
                                calcDiff += eachdiff;
                            })
                            calcDiff = calcDiff/(tempArr.length*100);
                            Object.assign(item,{'colorDiff':calcDiff});
                            console.log(item);
                        }
                        mergedArray = mergedArray.filter(a => a.colorDiff < 0.5); //criteria is set to under 0.5
                        //distance and string similarity calculation
                        const geopoint_a = new GeoPoint(Number(filteredMatchA[0].latitude),Number(filteredMatchA[0].longtitude));
                        var resultArr =[];
                        mergedArray.forEach(function(item) {
                            let geopoint_b = new GeoPoint(Number(item.latitude),Number(item.longtitude));   
                            let distance = geopoint_a.distanceTo(geopoint_b, inKilometers = true);
                            let b_item_with_distance = {...item, distance}
                            resultArr = [...resultArr, b_item_with_distance]
                        })
                        console.log(resultArr);
                        const item1name = filteredMatchA[0].name;
                        resultArr.forEach(item2 => {
                            let stringSim = stringSimilarity.compareTwoStrings(item1name,item2.name)
                            Object.assign(item2,{ 'StringSim':stringSim });
                        })
                        console.log(resultArr);
                        //match
                        resultArr.forEach(item => {
                            let score = (0.3*(item.distance))+(0.7*(1-item.StringSim)); 
                            Object.assign(item, { 'weightedScore':score });
                            console.log(item)
                        })
                        let minScore = Math.min.apply(Math, resultArr.map(function(item) { return item.weightedScore; }))
                        resultArr = resultArr.filter(a => a.weightedScore == minScore && a.weightedScore < 0.5);
                        console.log(resultArr);
                        if(resultArr.length != 0 && type == 'lost') {
                            resolve({code:1, status: '[Lost] Match found', item: resultArr});
                        } else if(resultArr.length == 0 && type == 'lost'){
                            resolve({code:2, status: '[Lost] Match not found', item: resultArr});
                        } else if(type == 'found') {
                            resolve({code:0, status: '[Found] Req locker', item: resultArr});
                        }
                    }
                });
            }
        });
    })
    
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

//Claims History
app.get('/claimhist', (req, res) => {
    connection.query(`SELECT JSON_ARRAYAGG(JSON_OBJECT(Items_lost.item_name, Claims.date_claimed, Persons.pid)) FROM Persons INNER JOIN Loses ON Loses.pid = Persons.pid INNER JOIN Items_lost on Items_lost.item_id = Loses.item_id INNER JOIN Claims on Claims.item_id = Items_lost.item_id`, 
        function(err, results) {
            if (err) throw err;
    });
});

//User Edit
app.post('/useredit', (req, res) => {
    var curr_pwd = req.body.curr_pwd;
    var new_pwd = req.body.new_pwd;
    var token = req.body.token;
    var result = jwt.verify(token, token_secret);
    var username = result.username
    //No username verification because to get to this point (changing password), user has to exist right?
    connection.query(`SELECT password FROM Persons WHERE username=?`, [username], (err,results)=>{
        if (curr_pwd == results[0].password){
            connection.query(`UPDATE Persons SET password=? WHERE username=?`, [new_pwd, username], (err, results) => {
                if (err) throw err;
                res.json({
                    message: "Current password is correct."
                })
            });
        } else {
            res.json({
                message: "Current password is incorrect."
            });
        }
    })
});

//PWD Recovery
//1. npm install nodemailer
//2. npm install nodemailer-smtp-transport
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

app.get('/recpwd', (req, res) => {
    const transporter = nodemailer.createTransport(smtpTransport({
        service: 'gmail', 
        host: 'stmp.gmail.com',
        auth: {
            user: 'lafaaschula@gmail.com',
            pass: 'Lafaas2021'
        }
    }));
    var email = req.query.email;
    if (connection.query(`SELECT 'email' FROM Persons WHERE email=?`, [email]) == null) {
        res.json({
            message: "There are no account with this email!"
        });
    } else {
        const newPassword = Math.random().toString(36).substring(2, 15);
        console.log(newPassword); 
        connection.query(`UPDATE Persons SET password=? WHERE email=?`, [newPassword, email], (err, results) => {
            if (err) throw err;
            console.log('set');
        });
        const mailOptions = {
            from: 'lafaaschula@gmail.com',
            to: email,
            subject: 'Your New Password',
            text: 'This is your new password 🌈 :  '+newPassword
        }
        transporter.sendMail(mailOptions, function(err, results) {
            if (err) {
                console.error(err);
            } else {
                console.log(results);
            }
        });
    }
});

let scanInterval = {};
let current_qrid = 1;
/**
 * Generate qrData and store in cache 
 * @param {*} item_id 
 * @param {*} item_current_location 
 * @param {*} device_token : aka noti_token
 * @param {*} type : lost or found
 * @param {*} module_id : can be null for type found
 * @returns qr_id
 */

async function getQR(item_id,device_token,type,module_id) { //for frontend client
    const return_qr = current_qrid
    current_qrid++;
    if(type === 'found' && typeof module_id === 'undefined')
        module_id = await getModuleID(item_id) //getModuleID(item_current_location) // moduleid will never be null at return
    const timestamp = Date.now();
    const QRdata = {"type": type,"moduleID": module_id, "itemID": item_id, "location": module_id.substring(0,4), "deviceToken": device_token, "timestamp": timestamp, "cancel": false, "scanInterval": null }
    qrAvailable[return_qr] = QRdata
    return return_qr;
}

async function getModuleID(item_id){
    let sql= `SELECT item_id, location_lat, location_long FROM Items_found WHERE item_id=`+item_id
    let sql2 = 'SELECT * FROM Lockers'
    const foundQuery = connection.promise().query(sql)
    const allLockerQuery = connection.promise().query(sql2)
    const [foundCoordinate] = await foundQuery
    const [allLockers] = await allLockerQuery
    const found_point = new GeoPoint(Number(foundCoordinate[0].location_lat),Number(foundCoordinate[0].location_long))
    var lockersWithDistance = []
    allLockers.forEach(locker =>{
      let locker_point = new GeoPoint(Number(locker.module_lat),Number(locker.module_long))
      let distance = found_point.distanceTo(locker_point, inKilometers = true)*1000;
      let lockerWithDistance = {...locker, distance}
      lockersWithDistance = [...lockersWithDistance, lockerWithDistance]
    })
    var shortestDistance = Math.min.apply(Math,lockersWithDistance.map(function(locker){return locker.distance;}))
    var retlocker = lockersWithDistance.find(function(locker){ return (locker.distance == shortestDistance && locker.vacancy == 0); })
    console.log("Closest Available Locker: "+retlocker.module_id);
    return retlocker.module_id
} 

// app.get('/requestQRdata', (req, res) => { //for frontend client
//     const item_id = req.query.item_id;
//     const device_token = req.query.device_token;
//     const type = req.query.type;
//     const item_current_location = req.query.item_current_location;

//     res.on('finish', () => {
//         const timer = setTimeout(() =>{
//             console.log(`Timer is end ${device_token}`)
//             delete scanInterval[device_token]
//         }, 3600000);
//         scanInterval[device_token] = timer;
//     });

//     const module_ID = 'ENG101' //getModuleID(item_current_location)
//     const timestamp = Date.now();
//     const QRdata = { "type": type,"moduleID": module_ID, "itemID": item_id, "location": item_current_location, "deviceToken": device_token, "TimeStamp": timestamp }
//     res.json(QRdata);
// })

/* 
{
   {
  1 : {
    type: 'lost',
    moduleID: 'ENG101',
    itemID: 1,
    location: 'ENG1',
    deviceToken: 'test',
    timestamp: 1618725018469,
    scanInterval: null
  }
}
*/
app.get('/informClient', (req, res) => { //for hardware
    const req_qr = req.query.qrid;
    const req_module = req.query.moduleID
    const msgfromHardware = req.query.msg
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(); 
    switch (msgfromHardware) {
        case `stopTimer`:
            if(qrAvailable[req_qr]){
                if(qrAvailable[req_qr]["location"]=== req_module){
                    if (qrAvailable[req_qr]["scanInterval"]) { //timer is running
                        clearTimeout(qrAvailable[req_qr]["scanInterval"]); //stop then delete
                        delete qrAvailable[req_qr]["scanInterval"];
                        console.log('QRisValid: '+req_qr)
                        if (qrAvailable[req_qr]["type"] === 'found'){
                            messages = [{
                                    to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                                    sound: "default",
                                    title: `Station ${qrAvailable[req_qr]["location"]}`,
                                    body: `The module ${qrAvailable[req_qr]["moduleID"]} is opened`,
                                    data : {
                                        msg: `The module ${qrAvailable[req_qr]["moduleID"]} is opened`,
                                        id: 1
                                    }
                                }];
                            noti(messages)
                            //noti user[token] `module: ${module_id} is opened`
                            console.log('Open module ' + qrAvailable[req_qr]["moduleID"])
                            res.json({'response':{'openModule': qrAvailable[req_qr]["moduleID"], 'type': qrAvailable[req_qr]["type"], 'device_token': qrAvailable[req_qr]["deviceToken"], 'itemID': qrAvailable[req_qr]["itemID"] }});
                        }
                        else if(qrAvailable[req_qr]["type"] === 'lost'){
                            //noti[token] 'scanFinger'
                            messages = [{
                                to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                                sound: "default",
                                title: `Station ${qrAvailable[req_qr]["location"]}`,
                                body: `Please scan your fingerprint with your right thumb`,
                                data : {
                                    msg: `Please scan your fingerprint with your right thumb.
                                    Module ${qrAvailable[req_qr]["moduleID"]} is waiting to open.`,
                                    id: 1
                                }
                            }];
                            noti(messages)
                            res.json({'response':{'scanFingerprint':qrAvailable[req_qr]["deviceToken"], 'openModule':qrAvailable[req_qr]["moduleID"], 'type':qrAvailable[req_qr]["type"], 'itemID': qrAvailable[req_qr]["itemID"]}})
                        }
                    } else { //timeout or invalid
                        //noti user[token] QrExpire
                        messages = [{
                            to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                            sound: "default",
                            title: `Station ${qrAvailable[req_qr]["location"]}`,
                            body: `Qr code is expired. Please restart the process`,
                            data : {
                                msg: `Qr code is expired. Please restart the process`,
                                id: 1
                            }
                        }];
                        noti(messages)
                        res.send({'response': 'QR expire '+req_qr});
                    }
                }
                else if(qrAvailable[req_qr]["location"]=== 'ALL1'){
                    if (qrAvailable[req_qr]["scanInterval"]) { //timer is running
                        clearTimeout(qrAvailable[req_qr]["scanInterval"]); //stop then delete
                        delete qrAvailable[req_qr]["scanInterval"];
                        if(qrAvailable[req_qr]["type"] === 'admin'){
                            messages = [{
                                to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                                sound: "default",
                                title: `Station ${req_module}`, //ALL1
                                body: `All expired module in ${req_module} is opened`,
                                data : {
                                    msg: `All expired module in ${req_module} is opened`,
                                    id: 1
                                }
                            }];
                            noti(messages)
                            connection.query(`UPDATE Items_found SET type = 2, description=concat('The item is now with faculty Lost and Found ', description) WHERE item_id IN (
                                            SELECT item_id FROM Stores WHERE module_id IS NOT NULL AND current_location='${req_module}' AND DATEDIFF(CURDATE(), date_added)>7)`)
                            connection.query(`SELECT module_id FROM Stores WHERE module_id IS NOT NULL AND current_location='${req_module}' AND DATEDIFF(CURDATE(), date_added)>7`, (err,results)=>{
                                if(err) console.log(err);
                                console.log('Open expire module at ' + req_module)
                                console.log(results)
                                const moduleIDs = results.map(result=>{
                                    moduleID = result.module_id
                                    return moduleID
                                })
                                if (results.length !== 0){
                                    const mString = moduleIDs.map(moduleID=>{
                                        modulewith = '\''+moduleID+'\'';
                                        return modulewith;
                                    })
                                    const modulesString = mString.toString();
                                    console.log(modulesString);
                                    connection.query(`UPDATE Lockers SET vacancy = 0 WHERE module_id IN (${modulesString})`,(err,results)=>{
                                        if(err) console.log(err);
                                    })
                                }
                                connection.query(`UPDATE Stores SET module_id = null WHERE current_location= '${req_module}' AND DATEDIFF(CURDATE(), date_added)>7`,(err,result)=>{
                                    if(err) throw err;
                                })
                                res.json({'response':{'openModule': moduleIDs, 'type': qrAvailable[req_qr]["type"], 'device_token': qrAvailable[req_qr]["deviceToken"], 'itemID': qrAvailable[req_qr]["itemID"] }});
                            })
                            //noti user[token] `module: ${module_id} is opened`
                        }
                    }
                }
                else{
                    messages = [{
                        to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                        sound: "default",
                        title: `Station ${req_module}`,
                        body: `Wrong station. Please go to ${qrAvailable[req_qr]["location"]}. You are now at ${req_module}`,
                        data : {
                            msg: `Wrong Station. Please go to ${qrAvailable[req_qr]["location"]}. You are now at ${req_module}`,
                            id: 1
                        }
                    }];
                    noti(messages)
                    res.send({'response': 'wrongStation'+ req_qr})
                }
            }else{
                messages = [{
                    to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                    sound: "default",
                    title: `Station ${req_module}`,
                    body: `Invalid QR code. Please proceed again with a new one`,
                    data : {
                        msg: `Invalid QR code. Please proceed again with a new one`,
                        id: 1
                    }
                }];
                noti(messages)
                res.send({'response': 'invalidQR'+req_qr})
            }
        break;
        case 'QrExpire':
                //noti user[token] QrExpire
                messages = [{
                    to : `ExponentPushToken[${qrAvailable[req_qr]["deviceToken"]}]`,
                    sound: "default",
                    title: `Station ${qrAvailable[req_qr]["location"]}`,
                    body: `Qr code is expired. Please restart the process`,
                    data : {
                        msg: `Qr code is expired. Please restart the process`,
                        id: 1
                    }
                }];
                noti(messages)
                res.send('ExpireNotiSentTo: '+ qrAvailable[req_qr]["deviceToken"]) 
        break;
        case 'moduleClosed':
            const type = req.query.type
            const device_token = req.query.token
            const module_id = req.query.module_id
            const item_id = req.query.item_id
            if (type === 'found'){
                //update store
                let sql = `INSERT INTO Stores(item_id,module_id,date_added,current_location) VALUES (${item_id},'${module_id}','${date}','${module_id.substring(0,4)}')`
                connection.query(sql,(err,result)=>{
                    if (err) throw err;
                    console.log(`INSERT INTO Stores with item_id: ${item_id}, module_id: ${module_id}`)
                })
                //update vacancy
                let sql2 = `UPDATE Lockers SET vacancy = 1 WHERE module_id = '${module_id}'`
                connection.query(sql2,(err,result)=>{
                    if (err) throw err;
                    console.log(`UPDATE vacancy module_id: ${module_id}`)
                })
                //noti user found item is stored successfully
                messages = [{
                    to : `ExponentPushToken[${device_token}]`,
                    sound: "default",
                    title: `Station ${module_id.substring(0,4)}`,
                    body: `Item is stored successfully, thanks for helping Chula community! `,
                    data : {
                        id: 0,
                        type: 'found'
                    }
                }];
                noti(messages)
                res.send({"moduleID": module_id, "vacancy": 1})
            }
            if (type === 'lost'){
                const fingerprint = req.query.fingerUrl
                connection.query(`SELECT type FROM Items_found WHERE item_id=${item_id}`,(err,result)=>{
                    if (err) throw err;
                    console.log(typeof result[0].type)
                    console.log(result[0])
                    if (result[0].type == 1){ //not cancel
                        let sql = `UPDATE Claims SET fingerprint = '${fingerprint}', date_claimed = '${date}' WHERE item_id = ${item_id}`
                        connection.query(sql,(err,result)=>{
                            if (err) throw err;
                            console.log(`UPDATE Claim with moduleID: ${module_id}, fingerprint = ${fingerprint}, date_claimed = ${date}`)
                        })
                        connection.query(`UPDATE Items_found SET type = 2 WHERE item_id = ${item_id}`,(err,result)=>{
                            if(err) throw err;
                            console.log(`CLAIMED Item_found item_id: ${item_id} from reserved --> claimed`) //set type back to registered  
                        })
                        connection.query(`UPDATE Stores SET module_id = null WHERE item_id= ${item_id}`,(err,result)=>{
                            if(err) throw err;
                            console.log(`REMOVE from Stores, module_id of item_id=${item_id}`)
                        })
                        let sql2 = `UPDATE Lockers SET vacancy = 0 WHERE module_id = '${module_id}'`
                        connection.query(sql2,(err,result)=>{
                            if (err) throw err;
                            console.log(`UPDATE vacancy module_id: ${module_id}`)
                        })
                        messages = [{
                            to : `ExponentPushToken[${device_token}]`,
                            sound: "default",
                            title: `Station ${module_id.substring(0,4)}`,
                            body: `Item is Claimed, Thanks for using LaFaaS `,
                            data : {
                                id: 0,
                                type: "lost"
                            }
                        }];
                        noti(messages)
                        //send noti claim successfully
                        res.send({"moduleID": module_id, "vacancy": 0})
                    }else{
                        messages = [{
                            to : `ExponentPushToken[${device_token}]`,
                            sound: "default",
                            title: `Station ${module_id.substring(0,4)}`,
                            body: `Claiming is canceled`,
                            data : {
                                msg: `Claiming is canceled`,
                                id: 1
                            }
                        }];
                        noti(messages)
                        //send noti claim canceled
                        res.send({"moduleID": module_id, "vacancy": 1})
                    }
                })  
            }
        break;
        default:
                res.send({'response': 'Invalid Message'})
            break;
    }
    
})

app.get('/cancelClaim',(req,res)=>{
    const req_qr = req.query.qr_id
    if(qrAvailable[req_qr]){
        if(qrAvailable[req_qr]["cancel"] === false){
            qrAvailable[req_qr]["cancel"] = true
            console.log("==========================================")
            console.log(`cancel claim qr_id ${req_qr}`)
            connection.query(`DELETE FROM Claims WHERE item_id = ${qrAvailable[req_qr]["itemID"]}`,(err,result)=>{
                if(err) throw err;
                console.log(`DELETE FROM Claims item_id: ${qrAvailable[req_qr]["itemID"]}`)  
            })
            connection.query(`UPDATE Items_found SET type = 0 WHERE item_id = ${qrAvailable[req_qr]["itemID"]}`,(err,result)=>{
                if(err) throw err;
                console.log(`RESET Item_found item_id: ${qrAvailable[req_qr]["itemID"]} from reserved --> registered`) //set type back to registered  
                console.log("==========================================")
            })
            res.send(`claim qr id: ${req_qr}, cancel`)
        }
        else{
            res.send("already cancel, aborting")
        }   
    }
    else
        res.send("invalid qrid for cancel claim")
})

app.post('/uploadFingerprint', upload.single('image'), (req,res)=>{
    const fingerprint = req.file.location;
    const module_id = req.body.module_id;
    const type = req.body.type;
    const device_token = req.body.device_token;
    const itemID = req.body.itemID

    if (fingerprint){
        console.log('Open module ' + module_id)
        messages = [{
            to : `ExponentPushToken[${device_token}]`,
            sound: "default",
            title: `Station ${module_id.substring(0,4)}`,
            body: `If it's not yours. Press cancel and shut the door`,
            data : {
                msg: `If it's not yours. Press cancel and shut the door`,
                id: 2
            }
        }];
        noti(messages)
        res.json({'openModule': module_id, 'type': type, 'device_token': device_token, 'fingerprintUrl': fingerprint, 'itemID': itemID});
    }
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

//notification funciton
function noti(messages){ // msg needs to be in complete format laew na
    // message format
    // messages = [{
    //     to : "ExponentPushToken[tokenstring]",
    //     sound: "default",
    //     title: "this should be the title",
    //     body: "this is the small text",
    //     data : {
    //         msg: "idk why we are going so deep in JSON format i'm dizzy",
    //         id: pid or item_id can go here,
    //         description: "item description",
    //         you get the idea, put your data here
    //     }
    // }]; 
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        // Send the chunks to the Expo push notification service. There are
        // different strategies you could use. A simple one is to send one chunk at a
        // time, which nicely spreads the load out over time:
        for (let chunk of chunks) {
          try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(ticketChunk);
            tickets.push(...ticketChunk);
            // NOTE: If a ticket contains an error code in ticket.details.error, you
            // must handle it appropriately. The error codes are listed in the Expo
            // documentation:
            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
          } catch (error) {
            console.error(error);
          }
        }
    })();
}
