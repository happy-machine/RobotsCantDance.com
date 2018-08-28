var express = require('express');
var app = express();
const port = process.env.PORT || 5000;
var _ = require ('lodash')
var express = require('express'); 
var cors = require('cors')
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const rp = require('request-promise')
var client_id = 'dd991e3ab8114a45bafbd430281adc65'; 
var client_secret = 'e3d433cb69314a93a86e917aa36f1f12'; 
var host_redirect_uri = `http://localhost:5000/callback/`; 
var guest_redirect_uri = `http://localhost:5000/guestcallback/`; 
var globalRefreshToken;
var host = {
  token: null,
  name: null
}
let users = [];
var tokenExpiry = new Date().getTime();
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

var getUserOptions = (token) => {
  return { 
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true 
  }
};

var getPlaybackOptions = (token) => {
 return {
  url: 'https://api.spotify.com/v1/me/player/currently-playing',
  headers: { 'Authorization': 'Bearer ' + token },
  json: true 
 }
};

var setPlaybackOptions = (token, master) => {
  return {
   url: 'https://api.spotify.com/v1/me/player/play',
   headers: { 'Authorization': 'Bearer ' + token },
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
      redirect_uri: host_redirect_uri,
      state: state
    }));
});

app.get('/invite', function(req, res) {
 console.log('in invite')
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
  } else { res.redirect('/error?error=NoHostConnected') }
});

app.get('/callback', function(req, res) {
  console.log('in host callback')
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
        redirect_uri: host_redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    rp.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        host.token = body.access_token
        getUserOptions.token = host.token
        rp.post(getUserOptions).then((res) => {
          host.name = res.display_name
          res.set('Content-Type', 'application/json')
          res.redirect(`http://localhost:3000/#${querystring.stringify({
            token: host.token
          })}`)
        })
        console.log(`Host Name: ${host.name}, Host Token: ${host.token}, Users: ${users}`)
      } else {
        res.redirect(`http://localhost:3000/#${querystring.stringify({
          token: host.token
        })}`)
      }
    });
  }
});

app.get('/guestcallback', function(req, res) {
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
    rp.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        let newUser = {}
        newUser.token = body.access_token
        getUserOptions.token = newUser.token
        rp.post(getUserOptions).then((res) => {
          newUser.name = res.display_name
          users.push(newUser)
        res.set('Content-Type', 'application/json')
        res.redirect(`http://localhost:3000/#${querystring.stringify({
          token: host.token
        })}`)
        })
        console.log('success token=', globalToken,' userTokens: ', userTokens)
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

const syncToMaster = (host, users) => {
  let allUsers =[]
  allUsers.push(host.token)
  allUsers.concat(users.map(user => user.token))
  allUsers.forEach(
    (user) => {
      if (checkCurrentTrack(user).track_uri !== master.track_uri) {
        master = checkCurrentTrack(user)
        allUsers.splice(allUsers.indexOf(user),1)
        resync(allUsers, master)
      } 
    })
}

const resync = (allUsers, master) => {
  allUsers.forEach(user =>  rp.put(setPlaybackOptions(user,master).then(res => console.log(res))))
}

const checkCurrentTrack = (user) => {
  return rp.get(getPlaybackOptions(user)).then((res) => {
    return { 
      track_uri: res.context.uri,
      track_name: res.item.name,
      artist_name: res.item.artist[0].name,
      play_position: res.progress_ms,
      selector_name: null,
      selector_token: null}
  })
}

setTimeout(() => {
  syncToMaster(host, users)
}, 350);

app.listen(port, () => {
  console.log(`Started RCD Server on localhost:${port}`);
});