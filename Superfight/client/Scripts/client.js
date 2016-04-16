//Get the socket
var socket = io();

//Main angular module here
angular.module('myApp', []).controller('myController',
    ['$scope', function ($scope) {
        
        $scope.roomID = "";
        $scope.username = "";
        $scope.usernameSubmitted = false;
        $scope.opponentUsername = "";
        
        $scope.newRound = function () {
            $scope.threeCards = { white: [], black: [] };
            $scope.playerCards = [];
            $scope.opponentCards = [];
            $scope.submitted = false;
            $scope.opponentSubmitted = false;
            $scope.hasOpponent = false;
            $scope.opponentUsername = "";
            socket.emit("newRound");
        };
        
        $scope.submitUsername = function () {
            $scope.usernameSubmitted = true;
            socket.emit("joinRoom", $scope.username);
            $scope.newRound();
            $scope.$apply();
        }
        
        socket.on("roomID", function (roomID) {
            $scope.roomID = roomID;
            $scope.$apply();
        })
        
        socket.on("newRound", function () {
            $scope.newRound();
            $scope.$apply();
        });
        
        socket.on("playerCards", function (playerCards) {
            $scope.playerCards = playerCards;
            $scope.$apply();
        });
        
        socket.on("opponentCards", function (opponentCards) {
            $scope.opponentCards = opponentCards;
            $scope.opponentSubmitted = true;
            $scope.$apply();
        });
        
        socket.on("threeWhiteCards", function (cards) {
            $scope.threeCards.white = cards;
            $scope.$apply();
        });
        
        socket.on("threeBlackCards", function (cards) {
            $scope.threeCards.black = cards;
            $scope.$apply();
        });
        
        socket.on("opponentReady", function (username) {
            if ($scope.username != "") $scope.opponentUsername = username;
            $scope.hasOpponent = true;
            $scope.$apply();
        });
        
        //When the user clicks on a card (selects the card)
        $scope.selectCard = function (value, colour) {
            if (colour == "W") {
                $scope.threeCards.white.forEach(function (card) {
                    card.selected = false;
                    if (card.value == value) card.selected = true;
                });
            } else {
                $scope.threeCards.black.forEach(function (card) {
                    card.selected = false;
                    if (card.value == value) card.selected = true;
                });
            }
        };
        
        $scope.cannotSubmit = function () {
            var whiteChosen;
            var blackChosen;
            $scope.threeCards.white.forEach(function (card) {
                if (card.selected) whiteChosen = true;
            });
            $scope.threeCards.black.forEach(function (card) {
                if (card.selected) blackChosen = true;
            });
            
            return !(whiteChosen && blackChosen);
        };
        
        $scope.submit = function () {
            $scope.submitted = true;
            var whiteChosen;
            var blackChosen;
            $scope.threeCards.white.forEach(function (card) {
                if (card.selected) whiteChosen = card;
            });
            $scope.threeCards.black.forEach(function (card) {
                if (card.selected) blackChosen = card;
            });
            socket.emit("submit", whiteChosen, blackChosen);
        };

    }
]);