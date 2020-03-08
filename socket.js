const WebSocketClient = require('websocket').client
const client = new WebSocketClient();
const uuidv1 = require('uuid/v1');

const requestCallbacks = {}
const subscriptions = {}

let conn

function connect(route = 'ws://localhost:1337/', verbose = false) {
    return new Promise((resolve, reject) => {
        client.on('connectFailed', function (error) {
            reject(error.toString());
        })
        
        client.on('connect', function (connection) {
            conn = connection
            console.log('WebSocket Client Connected')
            connection.on('error', function (error) {
                console.log("Connection Error: ", error.toString());
            })
            connection.on('close', function () {
                console.log('Connection Closed')
            })
            connection.on('message', function (message) {
                verbose && console.log("message: " + message.utf8Data)
                const response = JSON.parse(message.utf8Data)
                if (message.type === 'utf8') {
                    const requestId = response.RequestId
                    const eventRoute = response.EventRoute
                    if (requestId) {
                        requestCallbacks[requestId](response)
                        requestCallbacks[requestId] = null
                    }
                    else if (eventRoute) {
                        if (subscriptions[eventRoute]) {
                            for (fn of Object.values(subscriptions[eventRoute])) {
                                if (fn) {
                                    fn(...(response.Parameters || []))
                                }
                            }
                        }
                    }
                }
            })
            resolve()
        })
        client.connect(route)
    })
}

function sendRequest(route, ...params) {
    const requestId = uuidv1()
    const requestObj = {Route: route, Parameters: params, RequestId: requestId}

    const requestPromise = new Promise((resolve, reject) => {
        requestCallbacks[requestId] = (response) => {
            if (response.Error) {
                reject(response.Error)
            }
            else {
                resolve(response.Data);
            }
        }
    })
    conn.sendUTF(JSON.stringify(requestObj));

    return requestPromise;
}

function subscribe(route, key, fn) {
    if (!subscriptions[route]) {
        subscriptions[route] = {}
    }
    subscriptions[route][key] = fn
}

function unsubscribe(route, key) {
    subscriptions[route][key] = null
}

module.exports = {connect, sendRequest, subscribe, unsubscribe}