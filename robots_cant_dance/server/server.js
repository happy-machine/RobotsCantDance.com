/*jshint esversion: 6 */

// Config and variables
CLIENT_ID = 'dd991e3ab8114a45bafbd430281adc65';
CLIENT_SECRET = 'e3d433cb69314a93a86e917aa36f1f12';
HOST_REDIRECT_URI = `http://localhost:5000/callback/`;
GUEST_REDIRECT_URI = `http://localhost:5000/guestcallback/`;
PERMISSIONS_SCOPE = 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private';

// Server dependancies
var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
var _ = require('lodash');
var express = require('express');
var cors = require('cors');
var querystring = require('querystring');
var rp = require('request-promise');
var spotify = require('./spotify-functions');
var host = {
    token: null,
    name: null
};
var users = [];
var rooms = [];
var RateLimit = require('express-rate-limit');
var limiter = new RateLimit({
    windowMs: 10 * 60 * 60 * 1000, // 10 hour window
    max: 250
});

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(limiter);

var master = {
    users:[],
    invite_code: null,
    track_uri: null,
    track_name: null,
    artist_name: null,
    play_position: null,
    selector_name: null,
    selector_token: null
};


app.get('/login', function (req, res) {
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: PERMISSIONS_SCOPE,
            redirect_uri: HOST_REDIRECT_URI,
        })
    );
});

app.get('/invite', function (req, res) {
    console.log('IN INVITE');
    if (req.query.room_id) {
        res.redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: CLIENT_ID,
                scope: PERMISSIONS_SCOPE,
                redirect_uri: GUEST_REDIRECT_URI,
                room_id: req.query.room_id
            }));
    } else {
        console.log('error in invite');
        res.redirect('http://localhost:3000/error?error=No_Host_Connected');
    }
});

app.get('/callback', function (req, resp) {
    console.log('IN HOST CALLBACK');
    var code = req.query.code || null;
    rp.post(spotify.authOptions(HOST_REDIRECT_URI, code), function (error, response, body) {
        if (!error && response.statusCode === 200) {
            host.token = body.access_token;
            rp(spotify.getUserOptions(host))
                .then((res) => {
                    host.name = res.display_name;
                    // return rp(spotify.playTrack(host));
                })
                .then(res => checkCurrentTrack(host, master))
                .then((res) => {
                    res.invite_code = generateRandomString(8);
                    res.host = host;
                    res.users = [];
                    res.users.push(host);
                    rooms.push(res);
                    console.log(rooms);
                    resp.redirect('http://localhost:3000/room?' +
                    querystring.stringify({
                        room_id: res.invite_code
                    }));
                    runDaLoop();
                    // master = res; resp.send(master); console.log('master', master);
                })
                .catch(e => console.log('in host callback', e));
        } else {
            console.log('error in host post to spotify'.red);
        }
    }).catch(e => console.log('error in callback rp.post', e));

});

app.get('/guestcallback', function (req, resp) {
    var code = req.query.code || null;
    var room_id = req.query.room_id || null;
    rp.post(spotify.authOptions(GUEST_REDIRECT_URI, code), function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var newUser = {};
            newUser.token = body.access_token;
            rp(spotify.getUserOptions(newUser)).then((res) => {
                newUser.name = res.display_name;
                rooms.forEach((room) =>{
                    if(room.invite_code === room_id){
                        room.users.push(newUser);
                    }
                });
                resp.redirect('http://localhost:3000/room?' +
                    querystring.stringify({
                        room_id: room_id
                    }));
                runDaLoop();
            }).catch(e => console.log('in guest callback', e.message));
            console.log('host', host, ' //// users: ', users);
        } else {
            console.log('error in guest post to spotify');
        }
    }).catch(e => console.log('error in guest callback rp.post'));
});

const syncToMaster = (rooms, resp = false) => {
    rooms.forEach((room) => {
        if (room.host.token && room.users) {
            console.log('going to sync particpants of: ', room.invite_code);
            console.log('all users', room.users);
            room.users.forEach(
                (user) => {
                    //What track is the user currently listening too, and does it match the room track?
                    checkCurrentTrack(user, room)
                        .then(result => {
                            //If not, do iiiiiit.
                            if (result.track_uri !== room.track_uri) {
                                // playTrack(user, room);
                            } else {
                                console.log('User is playing the correct track');
                            }
                            return true;
                        })
                        .catch(e => console.log(e.message));
                });
        } else {
            console.log('TCL: host, users,', host, users);
        }
    });
};


// polling loop at 1s
const runDaLoop = () => {
    setInterval(() => {
        console.log('running loop');
        syncToMaster(rooms);
    }, 1000);
};

var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    // return text;
    return 'ABC1234';
};


const checkCurrentTrack = (user, master) => {
    return rp(spotify.getPlaybackOptions(user, master)).then((res) => {
        const master_ref = {
            track_uri: res.context.uri,
            track_name: res.item.name,
            artist_name: res.item.artists[0].name,
            play_position: res.progress_ms,
            selector_name: user.name,
            selector_token: user.token
        };
        return master_ref;
    })
        .catch(e => console.log(e.message));
};


app.listen(port, () => {
    console.log(`Started RCD Server on localhost:${port}`);
});
