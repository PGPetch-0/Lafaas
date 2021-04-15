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
const { TemporaryCredentials } = require('aws-sdk');
const token_secret = 'yvMFMf1PVjHxtjSKAYmMvqCqVenaMDYG';
const stringSimilarity = require('string-similarity');

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

//Matching
function match (item_id,type) {
    let matchA = [];
    let colorA = [];
    connection.query("SELECT (JSON_OBJECT('name', Items_"+type+".item_name, 'category', Items_"+type+".category, 'item_id', Items_"+type+".item_id, 'latitude', Items_"+type+".location_lat, 'longtitude', Items_"+type+".location_long, 'location', Items_"+type+".location_desc, 'description', Items_"+type+".description, 'color', Items_"+type+"_color.color)) FROM Items_"+type+", Items_"+type+"_color WHERE Items_"+type+".item_id=? AND Items_"+type+".item_id = Items_"+type+"_color.item_id", [item_id], function(err, results) {
        if (err) {
            throw err;
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
            switch (type) {
                case 'found': {
                    matchCat(filteredMatchA,'lost');
                }
                case 'lost': {
                    matchCat(filteredMatchA,'found');
                }
            }
        }
    });
}

function matchCat(matchA, type){
    connection.query("SELECT (JSON_OBJECT('name', Items_"+type+".item_name, 'item_id', Items_"+type+".item_id, 'latitude', Items_"+type+".location_lat, 'longtitude', Items_"+type+".location_long, 'location', Items_"+type+".location_desc, 'description', Items_"+type+".description, 'color', Items_"+type+"_color.color)) FROM Items_"+type+", Items_"+type+"_color WHERE Items_"+type+".category=? AND Items_"+type+".item_id = Items_"+type+"_color.item_id", matchA[0].category, function(err, results) {
        if (err) {
            throw err;
        } else {
            let matchB = results.map(result => Object.values(result)[0]);
            //console.log(matchB);
            matchB.map(a => {
                let colorTemp = [];
                colorTemp.push(a.color);
                a.color = colorTemp;
            });
            //console.log(matchB);
            const arrayHashmap = matchB.reduce((obj, item) => {
                obj[item.item_id] ? obj[item.item_id].color.push(...item.color) : (obj[item.item_id] = { ...item });
                return obj;
            }, {});
            const mergedArray = Object.values(arrayHashmap);
            //console.log(mergedArray);
            return matchColor(matchA,mergedArray,type);
        }
    });
}

function matchColor(a,b,type) {
    //color ex.['ffffff','000000','7f7f7f']
    for(item of b) {
        let bColor = item.color;
        let tempArr = [];
        for(color of a[0].color) {
            bColor.map(c => {
                let diff = colordiff.compare(color,c);
                tempArr.push(diff);
            })
            //console.log(tempArr);
        }
        let calcDiff = 0;
        tempArr.map(eachdiff => {
            calcDiff += eachdiff;
        })
        calcDiff = calcDiff/(tempArr.length*100);
        Object.assign(item,{'colorDiff':calcDiff});
    }
    b = b.filter(a => a.colorDiff < 1); //criteria is to be set to under 0.5
    return distanceCal(a,b,type);
}

function distanceCal(a,b,type) { 
    const geopoint_a = new GeoPoint(Number(a[0].latitude),Number(a[0].longtitude));
    var resultArr =[];
    b.forEach(function(item) {
        let geopoint_b = new GeoPoint(Number(item.latitude),Number(item.longtitude));   
        let distance = geopoint_a.distanceTo(geopoint_b, inKilometers = true);
        let b_item_with_distance = {...item, distance}
        resultArr = [...resultArr, b_item_with_distance]
    })
    console.log(resultArr);
    return StringSimilarity(a,resultArr,type)
}

function StringSimilarity(arrA, arrB,type) {
    //console.log(arrA)
    const item1name = arrA[0].name;
    arrB.forEach(item2 => {
        let stringSim = stringSimilarity.compareTwoStrings(item1name,item2.name)
        Object.assign(item2,{ 'StringSim':stringSim });
    })
    console.log(arrB);
    return findMatch(arrA,arrB,type);
}

function findMatch(arrA, arrB,type) {
    arrB.forEach(item => {
        let score = (0.3*(item.distance/2))+(0.7*(1-item.StringSim)); 
        Object.assign(item, { 'weightedScore':score });
    })
    let minScore = Math.min.apply(Math, arrB.map(function(item) { return item.weightedScore; }))
    arrB = arrB.filter(a => a.weightedScore == minScore && a.weightedScore < 0.5);
    console.log(arrB);
    switch (type) {
        case 'lost': {
            ret = {code:0, status: '[Found] Request for locker'};
            console.log(ret)
        }
        case 'found': {
            if(arrB != [])
            ret = {code:1, status: '[Lost] Match found', item: arrB};
            else ret = {code:2, status: '[Lost] Match not found'};
            console.log(ret)
        }
    } 
}

//match(6,'found');
match(20,'lost');

http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Call something u hoe 🤍');
});