//I use this as a test module in case you wanna query something and test independent function
const mysql = require('mysql2');
const GeoPoint = require('geopoint');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const app = require('express')();
const stringSimilarity = require('string-similarity');
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
//(async()=> await sortByDistance(2))()

testArr = [
    {
      name: 'jelly',
      color: '51b3f5',
      item_id: 5,
      latitude: 33,
      location: 'jshell',
      longitude: 22,
      description: 'dog',
      colorDiff: 100
    },
    {
      name: 'test',
      color: '6bed4e',
      item_id: 6,
      latitude: 20,
      location: 'hell',
      longitude: 30,
      description: 'no god',
      colorDiff: 100
    },
    {
      name: 'Jelly',
      color: '7909ba',
      item_id: 7,
      latitude: 21,
      location: 'location',
      longitude: 31,
      description: 'desk',
      colorDiff: 100
    },
    {
      name: 'Jelly',
      color: '804809',
      item_id: 8,
      latitude: 21,
      location: 'location',
      longitude: 31,
      description: 'desk',
      colorDiff: 67.32791769073214
    },
    {
      name: 'Jelly',
      color: '7f7f7f',
      item_id: 9,
      latitude: 21,
      location: 'location',
      longitude: 31,
      description: 'desk',
      colorDiff: 100
    },
    {
      name: 'bim',
      color: '000000',
      item_id: 11,
      latitude: 99,
      location: 'hell',
      longitude: 99,
      description: 'cursed cat',
      colorDiff: 100
    },
    {
      name: 'bim',
      color: '7f7f7f',
      item_id: 11,
      latitude: 99,
      location: 'hell',
      longitude: 99,
      description: 'cursed cat',
      colorDiff: 100
    },
    {
        name: 'Jelly',
        color: '23bc11',
        item_id: 12,
        latitude: -36.54321,
        location: 'CUIhouse',
        longitude: 40.5432,
        description: 'Chula girl',
        colorDiff: 100
    }
  ]
/**
 * query name from item id then compare to every entry's name in itemsArr
 * return an arr of itemsArr with itemSim key added
 * @param {Number} item_id 
 * @param {String} type 
 * @param {*} itemsArr 
 * @returns 
 */
async function StringSimilarity(item_id,type,itemsArr){
    var sql =''
    switch(type){
        case 'found':
            sql = `SELECT item_name FROM Items_found WHERE item_id=${item_id}`
        case 'lost':
            sql = `SELECT item_name FROM Items_lost WHERE item_id=${item_id}`;
    }
    const QueryPromise = connection.promise().query(sql);
    const [items,fields] = await QueryPromise;
    console.log(items)
    const item1name = items[0].item_name;
    itemsArr.forEach(item2=>{
        let stringSim = stringSimilarity.compareTwoStrings(item1name,item2.name)
        Object.assign(item2,{'StringSim':stringSim});
    })
    return itemsArr
}

async function requestQRdata(itemID,personID,type,item_current_location){
  const moduleIDAndToken = await getData(itemID,type)
  const module_ID = moduleIDAndToken['ModuleID'];
  const token = moduleIDAndToken['device_token'];
  const timestamp = Date.now();
  scanInterval = setTimeout(token => {
    //sendNoti(token)
    console.log("Timer is end")
  }, 1000);
  const QRdata = {"moduleID":module_ID,"itemID":itemID,"location":item_current_location,"notiToken":token,"TimeStamp":timestamp}
  return [QRdata,scanInterval]
}
//getModuleID and device_token
async function getData(itemID,type){
  if (type === 'found'){
    const moduleID = "ENG101" //placehold for test require query and module selection
    const sql = `select device_token from Items_found where item_id=${itemID}`  
    const queryPromise = connection.promise().query(sql)
    const [items,fields] = await queryPromise
    const ret = {"ModuleID": moduleID, "device_token": items[0].device_token}
    return ret
  }
} 

(async()=> {
  const [result,scanInterval] = await requestQRdata(1,1,'found','ENGINEER');
  console.log(result)
  console.log(scanInterval)
})()

//StringSimilarity(1,'found',testArr).then(result=>console.log(result))

