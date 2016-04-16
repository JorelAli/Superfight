" use strict ";

//Import libraries
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var express = require('express');
var fs = require('fs');

//The app, server and socket variables
var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

//Set the main client based page in the client folder (where the index.html is)
//This is where the page which is shown to the client is stored
app.use(express.static(path.resolve(__dirname, 'client')));

//Host the page
server.listen(process.env.PORT || 1337, process.env.IP || "192.168.1.81", function () {
    var addr = server.address();
    console.log("Server listening at", addr.address + ":" + addr.port);
});

//END OF COMPLICATED WEB STUFF

//START OF OBJECTS

//Card object
function Card(value, isWhite) {
    this.value = value;
    this.selected = false;
    this.isWhite = isWhite;
}

//User object (contains the socket and the player)
function User(socket, username, player) {
    this.socket = socket;
    this.username = username;
    this.playerCards = [];
}

//END OF OBJECTS

//Shuffles an array
function shuffle(array) {
    var counter = array.length;
    var temp;
    var index;
    while (counter > 0) {
        index = Math.floor(Math.random() * counter);
        counter--;
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

//Shuffles all arrays
function shuffleAll() {
    wCards = shuffle(wCards);
    bCards = shuffle(bCards);
}


//Loads the cards and creates arrays
var users = [];
var wCards = [];
var bCards = [];

populateArray(wCards);
populateArray(bCards);

function populateArray(array) {
    var fileName = "";
    if (array == wCards) fileName = "Characters.txt";
    else if (array == bCards) fileName = "Attributes.txt";
    var fileLocation = "../Superfight/Cards/" + fileName;
    
    fs.readFile(fileLocation, 'utf8', function (err, data) {
        if (err) return console.log(err);
        else {
            if (array == wCards) wCards = data.split("\n");
            else if (array == bCards) bCards = data.split("\n");
            shuffleAll();
        }
    });
}

//Returns an array of cards
function chooseCards(array, num) {
    if (array.length < num) populateArray(array);
    var isWhite;
    if (array == wCards) isWhite = true;
    else isWhite = false;
    var cards = [];
    for (var i = 0; i < num; i++) {
        cards.push(new Card(array[array.length - 1], isWhite));
        array.pop();
    }
    return cards;
}

function findUser(socket) {
    var tempUser;
    users.forEach(function (user) { if (user.socket == socket) tempUser = user; });
    return tempUser;
}

function findAvailableRoom(socket) {
    var roomID = 1;
    var newRoom = true;
    var opponentUsername = "";
    while (true) {
        var userCount = 0;
        users.forEach(function (user) {
            if (user.socket.room == "room" + roomID) {
                userCount++;
                opponentUsername = user.username;
            }
        });
        if (userCount == 1) newRoom = false;
        else opponentUsername = "";
        if (userCount < 2) break;
        else roomID++;
    }
    return { roomID: roomID, newRoom: newRoom, opponentUsername: opponentUsername };
}

function joinRoom(socket, username) {
    var availableRoom = findAvailableRoom(socket);
    socket.room = "room" + availableRoom.roomID;
    socket.emit("roomID", availableRoom.roomID);
    socket.join(socket.room);
    users.push(new User(socket, username, []));
    if (!availableRoom.newRoom) {
        socket.broadcast.to("room" + availableRoom.roomID).emit("opponentReady", username);
        socket.emit("opponentReady", availableRoom.opponentUsername);
    }
    console.log("A user has connected to room " + socket.room + ", there is a total of " + users.length + " users");
}

//Main events and listener
io.on('connection', function (socket) {
    
    socket.on("joinRoom", function (username) { joinRoom(socket, username); });
    
    //When a user starts a new round
    socket.on("newRound", function () {
        //Sends the 6 cards to choose from to the player using their socket
        socket.emit("threeWhiteCards", chooseCards(wCards, 3));
        socket.emit("threeBlackCards", chooseCards(bCards, 3));
        findUser(socket).playerCards = [];
    });
    
    //When a user submits their two chosen cards
    socket.on("submit", function (whiteChosen, blackChosen) {
        thisUser = findUser(socket);
        thisUser.playerCards.push(whiteChosen);
        thisUser.playerCards.push(blackChosen);
        thisUser.playerCards.push(chooseCards(bCards, 1)[0]);
        socket.emit("playerCards", thisUser.playerCards);
        socket.broadcast.to(socket.room).emit("opponentCards", thisUser.playerCards);
    });
    
    //When a user disconnects
    socket.on("disconnect", function () {
        var indexOfUser = users.indexOf(findUser(socket));
        if (indexOfUser != -1) users.splice(indexOfUser, 1);
        console.log('A user has disconnected, there are ' + users.length + " users");
        socket.broadcast.to(socket.room).emit("newRound");
    });
});