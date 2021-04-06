const mysql = require('mysql2');
const GeoPoint = require('geopoint');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const app = require('express')();
const expo = new Expo();
let connection = mysql.createConnection({
    host: "lafaas-db-do-user-8735555-0.b.db.ondigitalocean.com",
    user: "doadmin",
    password: "wmvyr6bjdsp1nv3w",
    database: "defaultdb",
    port: "25060"
});
async function distanceCal(lost_id){ 
    const lostQueryPromise = connection.promise().query(`SELECT * FROM Items_lost WHERE item_id=${lost_id}`);
    const foundQueryPromise = connection.promise().query('SELECT * FROM Items_found');
    const [found_items,foundfields] = await foundQueryPromise;
    const [lost_items,lostfields] = await lostQueryPromise;
    connection.close();
    const geopoint_lost = new GeoPoint(Number(lost_items[0].location_lat),Number(lost_items[0].location_long));
    var resultArr =[];
    found_items.forEach(function(found_item){
        let geopoint_found = new GeoPoint(Number(found_item.location_lat),Number(found_item.location_long));
        let distance = geopoint_lost.distanceTo(geopoint_found, inKilometers = true)*1000;
        let found_item_with_distance = {...found_item, distance}
        resultArr = [...resultArr, found_item_with_distance]
    })

    return resultArr
}

async function sortByDistance(lost_id){
    const distancefromLost = await distanceCal(lost_id)
    distancefromLost.sort((a,b)=> a.distance-b.distance)
    console.log(distancefromLost)
}
(async()=> await sortByDistance(2))()

