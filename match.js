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
    connection.query("SELECT (JSON_OBJECT('name', Items_"+type+".item_name, 'category', Items_"+type+".category, 'item_id', Items_"+type+".item_id, 'latitude', Items_"+type+".location_lat, 'longitude', Items_"+type+".location_long, 'location', Items_"+type+".location_desc, 'description', Items_"+type+".description, 'color', Items_"+type+"_color.color)) FROM Items_"+type+", Items_"+type+"_color WHERE Items_"+type+".item_id=? AND Items_"+type+".item_id = Items_"+type+"_color.item_id", [item_id], function(err, results) {
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
                    x = matchCat(filteredMatchA,'lost');
                }
                case 'lost': {
                    x = matchCat(filteredMatchA,'found');
                }
            }
        }
    });
}

function matchCat(matchA, type){
    connection.query("SELECT (JSON_OBJECT('name', Items_"+type+".item_name, 'item_id', Items_"+type+".item_id, 'latitude', Items_"+type+".location_lat, 'longitude', Items_"+type+".location_long, 'location', Items_"+type+".location_desc, 'description', Items_"+type+".description, 'color', Items_"+type+"_color.color)) FROM Items_"+type+", Items_"+type+"_color WHERE Items_"+type+".category=? AND Items_"+type+".item_id = Items_"+type+"_color.item_id", matchA[0].category, function(err, results) {
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
            return matchColor(matchA,mergedArray);
        }
    });
}

function matchColor(a,b) {
    //color ex.['ffffff','000000','7f7f7f']
    console.log(typeof b);
    console.log(b);
    for(color of a[0].color) { //each color of input
        for(item of b) { //each item being compared
            let bColor = item.color; //array of colors of said item
            let tempArr = [];
            bColor.map(c => {
                let diff = colordiff.compare(color,c);
                tempArr.push(diff);
            })
            Object.assign(item,{'colorDiff':tempArr});
            console.log(item);
        }
    }
}

//match(6,'found');
match(19,'lost');

http.listen(process.env.PORT || 7000, '0.0.0.0', () => {
    console.log('Call something u hoe 🤍');
});