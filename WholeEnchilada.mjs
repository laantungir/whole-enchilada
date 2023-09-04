
//////////////////////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////////////////////


import {objNostrEvents,
        intTimestampSeconds
        } from "@laantungir/utilities"

import WebSocket from 'ws';


//////////////////////////////////////////////////////////////////////
// GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////

const strLocalRelayURL = "ws://127.0.0.1:8888"


let objRelays = {"wss://relay.corpum.com":{"write":true,"read":true},
                        "wss://nostr.mom":{"write":true,"read":true},
}


//////////////////////////////////////////////////////////////////////
// CONNECT TO LOCAL RELAY
//////////////////////////////////////////////////////////////////////

const ConnectToLocalRelay = async () => { 

    const wsLocal = new WebSocket(strLocalRelayURL);

    wsLocal.on('error', console.error);

    wsLocal.on('open', function open() {
    //   ws.send('something');
    console.log("Local Relay Open")
    });

    wsLocal.on('message', function message(data) {
    console.log('Local Relay Received: %s', data);
    });

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
        //POSTS OF PEOPLE FOLLOWING
        
          "kinds": [1],
          "since": intTimestampSeconds() -100
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
    // console.log(`[${relay}] Message`) 
    // console.log(event)
    let E = JSON.parse( event.data)[2]
    // console.log("E outside", E, typeof E)
    // console.log("in", E, "E" in window)


    if( !(E.id === undefined)){
      // console.log("E inside", E, typeof E)
      E._id = E.id
      
      try { var response = await dbEvents.put(E) 
        console.log(response)} 
      catch (err) {console.log(err.message)}
    }
  }



//////////////////////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////////////////////

ConnectToLocalRelay()
ConnectToRelays()