var express = require('express');
var app = express();
const port = process.env.PORT || 5000;
var _ = require ('lodash')
var express = require('express'); 
var cors = require('cors')
var colors = require('colors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const rp = require('request-promise')
var client_id = 'dd991e3ab8114a45bafbd430281adc65'; 
var client_secret = 'e3d433cb69314a93a86e917aa36f1f12'; 
var host_redirect_uri = `http://localhost:5000/callback/`; 
var guest_redirect_uri = `http://localhost:5000/guestcallback/`; 
var host = {
  token: null,
  name: null
}
let users = [];
// var tokenExpiry = new Date().getTime();
var RateLimit = require('express-rate-limit');
var limiter = new RateLimit({
  windowMs: 10*60*60*1000, // 10 hour window
  max: 250
});
const PERMISSIONS_SCOPE = 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private';
var stateKey = 'spotify_auth_state';
var app = express();
app.use(express.static(__dirname + '/public'))
  .use(cookieParser())
  .use(cors())
  .use(limiter);


let master = {
  track_uri: null,
  track_name: null,
  artist_name: null,
  play_position: null,
  selector_name: null,
  selector_token: null
}

var getUserOptions = (user) => {
  return { 
    method: 'GET',
    uri: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + user.token },
    json: true 
  }
};

var getPlaybackOptions = (user) => {
 return {
  method: 'GET',
  uri: 'https://api.spotify.com/v1/me/player/currently-playing',
  headers: { 'Authorization': 'Bearer ' + user.token },
  json: true 
 }
};

var setPlaybackOptions = (user, master) => {
  return {
    method: 'PUT',
   uri: 'https://api.spotify.com/v1/me/player/play',
   headers: { 'Authorization': 'Bearer ' + user.token },
   json: true ,
   body: {
      "context_uri": master.track_uri,
      "offset": {
        "position": 1
      },
      "position_ms": master.play_position
    }
   }
 };

let authOptions = (redirect_uri, code) => {
    return {
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
  }
}

const wait = (time, res = null) => {
    return new Promise((resolve, fail) => {
      setTimeout(() => {
        resolve(res)
      }, time);
    })
  }
  


app.get('/login', function(req, res) {
  console.log('IN LOGIN'.green)
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: PERMISSIONS_SCOPE,
      redirect_uri: host_redirect_uri,
      state: state
    }));
});

app.get('/invite', function(req, res) {
 console.log('IN INVITE'.green)
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  if (host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: PERMISSIONS_SCOPE,
      redirect_uri: guest_redirect_uri,
      state: state
    }));
  } else { 
    console.log('error in invite'.red)
    res.redirect('/error?error=NoHostConnected') }
});

app.get('/callback', function(req, res) {
  console.log('IN HOST CALLBACK'.green);
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
  

    rp.post(authOptions(host_redirect_uri, code), function(error, response, body) {
      console.log('IN HOST PORT'.green)
      if (!error && response.statusCode === 200) {
        host.token = body.access_token
        rp(getUserOptions(host)).then((res) => {
          host.name = res.display_name
          // res.set('Content-Type', 'application/json')
        }).catch(e => console.log('in host callback', e))
        console.log(`Host Name: ${host.name}, Host Token: ${host.token}, Users: ${users}`)
      } else {
        console.log('error in host post to spotify'.red)
      }
    }).catch(e => console.log('error in callback rp.post'));
  }
});

app.get('/guestcallback', function(req, res) {
  console.log('IN GUEST CALLBACK'.green)
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

    rp.post(authOptions(guest_redirect_uri, code), function(error, response, body) {
      if (!error && response.statusCode === 200) {
        let newUser = {}
        newUser.token = body.access_token
        rp(getUserOptions(newUser)).then((res) => {
          newUser.name = res.display_name
          users.push(newUser)
        }).catch(e => console.log('in guest callback', e))
        console.log('success token=', host.token,' users: ', users, newUser)
      } else {
        console.log('error in guest post to spotify'.red)
      }
    }).catch(e => console.log('error in guest callback rp.post'.red));
  }
});


var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const syncToMaster = (host, users) => {
console.log('TCL: syncToMaster -> host, users', host, users);

  let allUsers = users
  allUsers.push(host)
  allUsers.forEach(
    (user) => {
      if (checkCurrentTrack(user).track_uri !== master.track_uri) {
        master = checkCurrentTrack(user)
        resync(allUsers.splice(allUsers.indexOf(user),1), master)
      } 
    })
}

const resync = (allUsers, master) => {
  console.log('TCL: resync -> allUsers, master', allUsers, master.green);
  allUsers.forEach(user =>  rp(setPlaybackOptions(user,master).then(res => console.log(res)).catch(e => console.log(e))))
}

const checkCurrentTrack = (user) => {
  console.log('TCL: checkCurrentTrack -> user', user.green);
  return rp(getPlaybackOptions(user)).then((res) => {
    return { 
      track_uri: res.context.uri,
      track_name: res.item.name,
      artist_name: res.item.artist[0].name,
      play_position: res.progress_ms,
      selector_name: user.name,
      selector_token: user.token}
  }).catch(e => console.log(e))
}

// users.length && host.token && setTimeout(() => {
//   syncToMaster(host, users)
// }, 350);

app.listen(port, () => {
  console.log(`Started RCD Server on localhost:${port}`.green);
});