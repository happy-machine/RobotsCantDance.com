var http = require('http');
var express = require('express');
var app = express();
const port = process.env.PORT || 5000;
var _ = require ('lodash')
var nodemailer = require('nodemailer');
var express = require('express'); 
var cors = require('cors')
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const rp = require('request-promise')
var client_id = 'dd991e3ab8114a45bafbd430281adc65'; 
var client_secret = 'e3d433cb69314a93a86e917aa36f1f12'; 
var redirect_uri = `http://localhost:${port}/callback/`; 
var SpotifyWebApi = require('spotify-web-api-node')
var globalRefreshToken;
var globalToken;
var globalResults = [];
var tokenExpiry = new Date().getTime();
var RateLimit = require('express-rate-limit');
var limiter = new RateLimit({
  windowMs: 10*60*60*1000, // 10 hour window
  delayAfter: 1, // begin slowing down responses after the first request
  delayMs: 350, // slow down subsequent responses by one request every 350ms (Spotify is 250)
});
const PERMISSIONS_SCOPE = 'user-read-private user-read-email playlist-modify-public playlist-modify-private playlist-read-private user-read-private';
const server = http.createServer(app);
var stateKey = 'spotify_auth_state';
var app = express();
app.use(express.static(__dirname + '/public'))
  .use(cookieParser())
  .use(cors())
  .use(limiter);


const wait = (time, res = null) => {
    return new Promise((resolve, fail) => {
      setTimeout(() => {
        resolve(res)
      }, time);
    })
  }
  

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: PERMISSIONS_SCOPE,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
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
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    rp.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        globalRefreshToken = body.refresh_token;
        globalToken = body.access_token
        tokenExpiry = new Date() + (Math.floor(body.expires_in / 60) * 10000)
        res.redirect('/searchform.html')
      } else {
        res.redirect('/#' +
    querystring.stringify({
      error: 'invalid_token'
    }))
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
  })
}

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};



app.use('/',
    express.static('./public')
);

server.listen(port, () => {
  console.log(`Started TF Model server on localhost://${port}`);
});