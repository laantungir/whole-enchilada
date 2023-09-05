
//////////////////////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////////////////////

// import {fs} from 'fs'
import * as fs from 'fs';
import {objNostrEvents,
        intTimestampSeconds
        } from "@laantungir/utilities"

import WebSocket from 'ws'


//////////////////////////////////////////////////////////////////////
// GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////

const objSettings = JSON.parse(fs.readFileSync('./settings.json', 'utf8') )

const strLocalRelayURL = "ws://127.0.0.1:8888"
// const strLocalRelayURL = "wss://relay.corpum.com"

let wsLocal = ""

let objDefaultRelays = {"wss://relay.corpum.com":{"write":true,"read":true},
                        "wss://nostr.mom":{"write":true,"read":true},
                        "wss://relay.snort.social":{"write":true,"read":true},
                        "wss://relay.damus.io":{"write":true,"read":true},
                        "wss://nostr-pub.wellorder.net":{"write":true,"read":true},
}

let objRelays = {}

let arrSocket = [] // This is an array to hold all the websocket objects

//////////////////////////////////////////////////////////////////////
// LOCAL RELAY
//////////////////////////////////////////////////////////////////////

const ConnectToLocalRelay = async () => { 

    wsLocal = new WebSocket(strLocalRelayURL);

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
//////////////////////////////////////////////////////////////////////
// CONNECT TO REMOTE RELAYS
//////////////////////////////////////////////////////////////////////


const ConnectToRelays = async () => { 

    console.log(Object.keys(objRelays))

    for (const [index, [key, value]] of Object.entries(Object.entries(objRelays))){

        console.log(index, key, value)
        arrSocket[index]= new WebSocket(key)

        arrSocket[index].onopen = function(event) {
        wsOnOpen(event, key, index)
        }

        arrSocket[index].onmessage = function(event) {
        wsOnMessage(event,key)
        }

        arrSocket[index].onclose = function(event) {
        wsOnClose(event,key)
        }

        arrSocket[index].onerror = function(error) {
        wsOnError(error,key)
        }


        }
}


const SubscribeToEvents = async (idxSocket) =>{

    let ArrSub = ["REQ", "0", {

            "kinds": [1],
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

    console.log(`Subscribing to relay ${idxSocket}  ${arrSocket[idxSocket]}`)
    console.log(JSON.stringify(ArrSub))

    arrSocket[idxSocket].send(JSON.stringify(ArrSub))

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

  const wsOnOpen = async (event, relay, idxSocket) =>{
    console.log(`[${relay}] Connection established`) 

    SubscribeToEvents(idxSocket)
    // console.log(event)
    // PreloadUser()
  }

  const wsOnClose = async (event, relay) =>{
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

    objRelays[relay].events ++ 
    objRelays[relay].last_event_time = intTimestampSeconds()

    let arrE = JSON.parse( event.data ) 

    if (arrE[0] != "EVENT"){ return }

    console.log(relay," --> ", arrE[2].content.trim())
    console.log()
  
    SaveToLocalRelay(arrE[2])
    
  }


setInterval(async ()=> {
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
    console.log()
    for (const [index, [key, value]] of Object.entries(Object.entries(objRelays))){
        console.log(key, value.events, value.last_event_time)
    }
    
    console.log()
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')

}, 30000);

//////////////////////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////////////////////


// objRelays = objDefaultRelays 


let arrAllRelays = await arrNostrRelaysFromNostrWatch()
console.log(arrAllRelays)
let NumRelays = 1000 

if (NumRelays > arrAllRelays.length){
    NumRelays = arrAllRelays.length
}


// Shuffle array
const arrShuffled = arrAllRelays.sort(() => 0.5 - Math.random());
let arrSelected = arrShuffled.slice(0, NumRelays);


objRelays = {}
for (let i = 0; i < NumRelays ; i++){
    objRelays[arrSelected[i]] = {"write":true, "read": true, "events": 0, "connected": false, "last_event_time": 0}
}


console.log (objRelays)
console.log (Object.keys(objRelays).length )

console.log(objSettings)

// ConnectToLocalRelay()
// ConnectToRelays()