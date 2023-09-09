
//////////////////////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////////////////////


import * as fs from 'fs';

import {objNostrEvents,
        intTimestampSeconds,
        } from "@laantungir/utilities"

import WebSocket from 'ws'

import {getEventHash, getSignature} from 'nostr-tools'


//////////////////////////////////////////////////////////////////////
// GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////

const objSettings = JSON.parse(fs.readFileSync('./settings.json', 'utf8') )

let objRelays = objSettings.relays

let wsLocal = ""

let objSocket = {} // This is an array to hold all the websocket objects

let arrCache = []
let intArrCacheLength = 20

//////////////////////////////////////////////////////////////////////
// LOCAL RELAY
//////////////////////////////////////////////////////////////////////

const ConnectToLocalRelay = async () => { 

    wsLocal = new WebSocket(objSettings.local_relay);

    wsLocal.on('error', console.error);

    wsLocal.on('open', function open() {
    //   ws.send('something');
    console.log("Local Relay Open")
    });

    wsLocal.on('message', function message(data) {
    console.log('Local Relay  %s', JSON.parse(data)[0]);
    });

}

const SaveToLocalRelay = async (Event) =>{

    let strSub = JSON.stringify(["EVENT", Event])
    wsLocal.send(strSub)
}

  // POST AN EVENT TO THE LOCAL RELAY
  const PostEvent = async (SecKey, PubKey, Kind, arrTags, strContent, ReceiverPubKey = "") => {

    let Event = {}  
    Event.pubkey = PubKey
    Event.created_at = Math.floor(Date.now() / 1000)
    Event.kind = Kind 
    Event.tags = arrTags 
    Event.content = strContent


    Event.id = getEventHash(Event)
    Event.sig = getSignature(Event, SecKey)

    let strSub = JSON.stringify(["EVENT", Event])
    wsLocal.send(strSub)

  }

//////////////////////////////////////////////////////////////////////
// CONNECT TO REMOTE RELAYS
//////////////////////////////////////////////////////////////////////


const ConnectToRelays = async () => { 

  // console.log(Object.keys(objRelays))

  for (let Relay of Object.keys(objRelays)){

    if (objRelays[Relay].connect){
      console.log("Connect to ", Relay)

      objSocket[Relay]= new WebSocket(Relay)

      objSocket[Relay].onopen = function(event) {
      wsOnOpen(event,  Relay)
      }

      objSocket[Relay].onmessage = function(event) {
      wsOnMessage(event, Relay)
      }

      objSocket[Relay].onclose = function(event) {
      wsOnClose(event, Relay)
      }

      objSocket[Relay].onerror = function(error) {
      wsOnError(error, Relay)
      }
    }
  }
}


const SubscribeToEvents = async (Relay) =>{

    let ArrSub = ["REQ", "0", {


          "since": intTimestampSeconds() 
        }
        // ,
        // //SELF POSTS
        // {
        //   "kinds": [0,1,3],
        //   "authors": [hexPub],
        //   "since": MonthAgo
        // }
        // ,
        // //PRIVATE MESSAGES
        // {
        //   "kinds": [4],
        //   "#p": [hexPub]
        // }
        // ,
        // //EVENT 0 METADATA
        // {
        //   "kinds": [0],
        //   "authors": arrFollowing
        // }
      ]

    // console.log(event)
    // let E = JSON.parse( event.data)[2]

    console.log(`Subscribing to relay ${Relay}`)
    console.log(JSON.stringify(ArrSub))

    objSocket[Relay].send(JSON.stringify(ArrSub))

  }


const arrNostrRelaysFromNostrWatch = async () => {

let response = await fetch(`https://api.nostr.watch/v1/online`, {
    headers: {'Accept': 'application/nostr+json'}
})

const Info = await response.json()
return Info
}

const objNostrRelaysFromNostrWatch = async () =>{

    let arrNWR = await arrNostrRelaysFromNostrWatch()
    let objOut = {}
    for (var Each of arrNWR){
      objOut[Each] = {
          "write": false,
          "read": false
      }
    }
  
    console.log(objOut)
  
  }

//////////////////////////////////////////////////////////////////////
// REMOTE RELAY EVENTS
//////////////////////////////////////////////////////////////////////

  const wsOnOpen = async (event, relay) =>{
    console.log(`[${relay}] Connection established`) 
    objRelays[relay].connected = true
    SubscribeToEvents(relay)
    // console.log(event)
    // PreloadUser()
  }

  const wsOnClose = async (event, relay) =>{
    objRelays[relay].connected = false
    if (event.wasClean) {
      console.log(`[${relay}] Connection closed clean`) 
    } else {
      // console.log(`[${relay}] Connection closed`) 
    }
      // console.log(event)
  }

  const wsOnError = async (error, relay) =>{
    console.log(`[${relay}] ${error}`) 
    console.log()
  }


  const wsOnMessage = async (event, relay) =>{
    console.log(`message on relay ${relay}`)
    objRelays[relay].events ++ 
    objRelays[relay].last_event_time = intTimestampSeconds()

    let arrE = JSON.parse( event.data ) 

    // Check if it is an event
    if (arrE[0] != "EVENT"){ return }

    // Check the recent cache to see if we already received this
    // from another relay
    if ( arrCache.includes( arrE[2].id ) ){
        return
    }

    // add the item to the cache and remove last item
    arrCache.push(arrE[2].id)
    if (arrCache.length >  intArrCacheLength) { arrCache.shift() }

    // Add to the count of this type of event for posterity 
    if ( objNostrEvents[arrE[2].kind] != undefined){
      objNostrEvents[arrE[2].kind].count ++
    }

    // console.log(objNostrEvents)
    console.log(relay," --> ", arrE[2].content.trim())
    console.log()
  
    
    SaveToLocalRelay(arrE[2])
    
  }


// Every interval, post statistics locally
setInterval(async ()=> {
    // console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
    // console.log()
    // for (const [index, [key, value]] of Object.entries(Object.entries(objRelays))){
    //     console.log(key, value.events, value.last_event_time)
    // }
    
    // console.log()
    // console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')

    PostEvent(objSettings.keys.nsecHex, objSettings.keys.npubHex, 11000, [], JSON.stringify(objRelays))
    PostEvent(objSettings.keys.nsecHex, objSettings.keys.npubHex, 11001, [], JSON.stringify(objNostrEvents))

}, 50000);


// Every interval, check relays for connection 
// setInterval(async ()=> {

//   for (let Relay of Object.keys(objRelays))
//   {
//     if (objRelays[Relay].connect) {
//       console.log(objRelays[Relay])
//     }

//   console.log("Status", )

//   }
// }, 4000);


//////////////////////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////////////////////


// objRelays = objDefaultRelays 

// Set up objNostrEvents to start keeping track of their count
for (let Key of Object.keys(objNostrEvents)){
  objNostrEvents[Key].count = 0
}

// Help to set up relays in settings.
// let arrAllRelays = await arrNostrRelaysFromNostrWatch()
// let objR = {}
// for (let Each of arrAllRelays){
//   objR[Each] = {"write":true, "read": true, "events": 0, "connect": false, "connected": false, "last_event_time": 0}
// }
// fs.promises.writeFile('./relays.json', JSON.stringify(objR))
// console.log(arrAllRelays)


// process.exit()

let NumRelays = 1000

if (NumRelays > objRelays.length){
    NumRelays = objRelays.length
}

// Shuffle array
let arrSelected = Object.keys(objRelays)
arrSelected = arrSelected.sort(() => 0.5 - Math.random());
arrSelected = arrSelected.slice(0, NumRelays);

for (let Relay of arrSelected){
  objRelays[Relay].connect = true
}

await ConnectToLocalRelay()
ConnectToRelays()