var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var cron = require('node-cron');
var cheerio = require('cheerio');
var Nightmare = require('nightmare');

var app = express();
app.listen((process.env.PORT || 3000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Current version
ver = 'v.0.0.32';

// Server endpoint
app.get('/', function (req, res){
    res.send('JKDbot here! ' + ver);
    getUserIds();
});

// Facebook webhook
app.get('/webhook', function (req, res){
    if (req.query['hub.verify_token'] === 'jkdbot_verify_token') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});

// Handler receiving messages
app.post('/webhook', function (req, res){
    var events = req.body.entry[0].messaging;
    for (i = 0; i < events.length; i++){
        var event = events[i];
        if (event.message && event.message.text) {
            switch(event.message.text) {
                // Housekeeping commands
                case("cmd_version"): 
                    sendMessage(event.sender.id, {text: ver}); 
                    break;
                case("cmd_subscribers"): 
                    sendMessage(event.sender.id, {text: getUserIds()}); 
                    break;
                case("cmd_timezone"):
                    getUserAttributes(event.sender.id).then(function(res){
                        sendMessage(event.sender.id, {text: res.timezone}); 
                    });                                                            
                    break;
                case("cmd_stop_cron"): 
                    task.stop();
                    break;
                case("cmd_stop_restart"): 
                    task.start();
                    break;  
                // Ack to sender
                default: 
                    sendMessage(event.sender.id, {text: "Message received: " + event.message.text + " by " + event.sender.id});
                    break;
            }
        }
    }
    res.sendStatus(200);
});

// Scheduler (Everyday at 09_00AM)
var task = cron.schedule('* * 9 * *', function(){
    console.log('Running sendout');
    doSendout();
});
task.start();

// Main task
var doSendout = function(){
    sendMessage(me, {text: "jkdbot here" + ver});
}

// Sends a message to a Facebook user
var sendMessage = function(recipientId, message){
    request({
        url: 'https://graph.facebook.com/v2.8/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, html) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

// Scraps the userId's from the page likes html
var getUserIds = function(){ 
    var url = 'https://www.facebook.com/browse/?type=page_fans&page_id='+process.env.PAGE_ID;
    console.log(url);
    var nightmare = new Nightmare({ show: false });
    var page = nightmare.goto(url)
        .type('#email', 'drexa1@hotmail.com')
        .type('#pass', process.env.USER_ACCESS_TOKEN)
        .click('#loginbutton')
        .wait()
        .evaluate(function () {
            console.log('**********doing shit');            
            return document.querySelectorAll('.fsl');
        })
        .end()
        .then(function (result) {
            console.log(result)
        })
        .catch(function (error) {
            console.error('Search failed:', error);
        });
    console.log('Nightmare done');
};

// Retrieves the profile attributes of a user
var getUserAttributes = function(userId){
    return new Promise(function (resolve, reject){
        request({
            url: 'https://graph.facebook.com/v2.8/' + userId,
            qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
            method: 'GET'
        }, function(error, response, html) {
            if (error) {
                console.log('Error sending message: ', error);
                reject(error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
                reject(response.body.error);
            }
            var res = JSON.parse(response.body);
            resolve(res);
        });  
    });
};


