var express = require('express');
var app = express();
const port = process.env.PORT || 5000;
var express = require('express');
var querystring = require('querystring');
const rp = require('request-promise');
var request = require('request');
var WebSocketServer = require('websocket').server;
var http = require('http');
var client_id = 'dd991e3ab8114a45bafbd430281adc65';
var client_secret = 'e3d433cb69314a93a86e917aa36f1f12';
var host_redirect_uri = `http://localhost:5000/callback/`;
var guest_redirect_uri = `http://localhost:5000/guestcallback/`;
var globalRefreshToken;
var globalToken = false;
let userTokens = [];
var tokenExpiry = new Date().getTime();
const PERMISSIONS_SCOPE = 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private';
var stateKey = 'spotify_auth_state';
var bodyParser = require('body-parser')
var app = express();
var router = express.Router();

// Cross Domain Origin Setup
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};

// ALLOW CROSSDOMAIN
app.use(allowCrossDomain);
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


// DIRECT USER TO SPOTIFY LOGIN
router.get('/login', function (req, res) {
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: PERMISSIONS_SCOPE,
            redirect_uri: host_redirect_uri
        }));
});

// INVITE USER
router.get('/invite', function (req, res) {
    if (globalToken) {
        res.redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: client_id,
                scope: PERMISSIONS_SCOPE,
                redirect_uri: guest_redirect_uri
            }));
    } else { res.redirect('/error') }
});

// CALLBACK FROM SPOTIFY SUCCESSFUL AUTH EXCHANGE CODE FOR ACCESS TOKEN
router.get('/callback', function (req, res) {
    var code = req.query.code || null;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: host_redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };
    rp.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            globalToken = body.access_token;
            tokenExpiry = new Date() + (Math.floor(body.expires_in / 60) * 10000)
            res.set('Content-Type', 'application/json')
            res.redirect(`http://localhost:3000/#${querystring.stringify({
                token: globalToken
            })}`)
            console.log('success token=', globalToken, ' userTokens: ', userTokens)
        } else {
            res.redirect(`http://localhost:3000/#${querystring.stringify({
                token: globalToken
            })}`);
        }
    });
});

// NOT SURE??
router.get('/guestcallback', function (req, res) {
    console.log('in guest callback')
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: guest_redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };
        rp.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                userTokens.push(body.access_token)
                tokenExpiry = new Date() + (Math.floor(body.expires_in / 60) * 10000)
                res.set('Content-Type', 'application/json')
                res.redirect(`http://localhost:3000/#${querystring.stringify({
                    token: body.access_token
                })}`)
                console.log('success token=', globalToken, ' userTokens: ', userTokens)
            } else {
                res.redirect(`http://localhost:3000/#${querystring.stringify({
                    token: body.access_token
                })}`)
            }
        });
    }
});

rpSafe = (options) => {
    return new Promise((resolve, fail) => {
        var newTime = new Date().getTime();
        if (tokenExpiry - newTime <= 3000) {
            rp.post({
                url: 'https://accounts.spotify.com/api/token',
                headers: {
                    'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
                },
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: globalRefreshToken
                }, json: true
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log(`Refreshed Token, Will expire in: ${body.expires_in}`)
                    globalToken = body.access_token
                    var newTime2 = new Date().getTime();
                    var exp = (Math.floor(body.expires_in / 60) * 7000)
                    tokenExpiry = newTime2 + exp
                    resolve(rp(options))
                } else {
                    return fail('Error in refresh call')
                }
            })
        } else {
            resolve(rp(options))
        }
    });
};

// GET CURRENT PLAYING TRACK FROM USERTOKEN
router.post('/getCurrentPlayingTrack', function (req, res) {
    var token = req.body.userToken;
    var options = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    };
    request(options, function (error, response, body) {
        console.log(body);
        res.json({
            track: body.item.name,
            artist: body.item.artists[0].name,
            current_position: body.progress_ms
        });
    });
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', router); // register our route
app.listen(port, () => {
    console.log(`Started RCD Server on localhost:${port}`);
});