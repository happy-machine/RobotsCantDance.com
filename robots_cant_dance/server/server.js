var express = require('express');
var app = express();
const port = process.env.PORT || 5000;
var _ = require ('lodash')
var express = require('express'); 
var cors = require('cors')
const playbackDelay = 0
// playbackDelay pushes the track 'back'
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

const PERMISSIONS_SCOPE = 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private';
var stateKey = 'spotify_auth_state';
var app = express();
app.use(express.static(__dirname + '/public'))
  .use(cookieParser())
  .use(cors())


var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

let wait_promise = (time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time);
  })

}
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
  uri: 'https://api.spotify.com/v1/me/player/currently-playing',
  headers: { 
    'Authorization': 'Bearer ' + user.token,
    'Content-Type': 'application/json'
  },
  json: true 
 }
};

var setPlaybackOptions = (user, master, delay = 1) => {
console.log('setting playback to uri: ', master.track_uri, 'position: ', master.play_position, 'for: ', user.name)

  return {
    method: 'PUT',
   uri: 'https://api.spotify.com/v1/me/player/play',
   headers: { 'Authorization': 'Bearer ' + user.token },
   json: true ,
   body: {
      "uris": [master.track_uri],
      "position_ms": master.play_position - delay
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

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  if (!host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: PERMISSIONS_SCOPE,
      redirect_uri: host_redirect_uri,
      state: state
    }));
  } else {
    res.redirect('http://localhost:3000/alreadyHosted')
  }
});

app.get('/invite', function(req, res) {
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
    res.redirect('http://localhost:3000/error?error=No_Host_Connected') }
});

app.get('/callback', function(req, resp) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    resp.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    resp.clearCookie(stateKey);

    rp.post(authOptions(host_redirect_uri, code), function(error, response, body) {
      if (!error && response.statusCode === 200) {
        host.token = body.access_token
        rp(getUserOptions(host))
        .then((res) => {
          host.name = res.display_name
          resp.redirect('http://localhost:3000/hostLoggedIn')
        })
        .catch(e => console.log('in host callback', e.message))
      } else {
        console.log('error in host post to spotify'.red)
      }
    }).catch(e => console.log('error in callback rp.post'));
  }
});

app.get('/guestcallback', function(req, resp) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    resp.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    resp.clearCookie(stateKey);

    rp.post(authOptions(guest_redirect_uri, code), function(error, response, body) {
      if (!error && response.statusCode === 200) {
        let newUser = {}
        newUser.token = body.access_token
        rp(getUserOptions(newUser))
        .then( (res) => {
          newUser.name = res.display_name
          return checkCurrentTrack(host, master)
        })
        .then( (obj) => {
          master = obj;
          return rp(setPlaybackOptions(newUser, master, playbackDelay))
        })
        .then( (res) => {
          users = [...users,newUser]
          resp.redirect('http://localhost:3000/guestLoggedIn')
          pollUsersPlayback()
        })
        .catch(e => console.log('in guest callback', e.message))
      } else {
        console.log('error in guest post to spotify'.red)
      }
    })
    .catch(e => console.log('error in guest callback rp.post'.red));
  }
});


const syncToMaster = ( host, users) => {
  if (host.token && users.length){
    let allUsers = [...users, host]
    allUsers.some(
      (user) => {
        wait_promise(350)
        .then( () => checkCurrentTrack(user))
        .then( result => {
          if (result.track_uri !== master.track_uri) {
            console.log('resyncing ', master.track_uri, ' to ', result.track_uri,' played by ', result.selector_name)
            master = result
            allUsers.splice(allUsers.indexOf(user),1)
            resync(allUsers, master)
            return true
          } 
        })
        .catch(e => console.log(e.message))
      })
  } else {
    console.log('only one user in the room');
  }
}

const resync = (allUsers, master) => {
  allUsers.forEach((user =>  
    rp(setPlaybackOptions(user,master,playbackDelay))
    .then(() => console.log('Synced ', user, ' to ', master))
    .catch(e => console.log(e.message))))
}

// polling loop at 1s
 
const pollUsersPlayback = () => {
  setInterval(() => syncToMaster(host, users), 350 * (users.length + 1)); 
}

const checkCurrentTrack = (user) => {
  return new Promise (function (resolve, reject) {
    return rp(getPlaybackOptions(user)).then((res) => {
      const master_ref = { 
        track_uri: res.item.uri,
        track_name: res.item.name,
        artist_name: res.item.artists[0].name,
        play_position: res.progress_ms,
        selector_name: user.name,
        selector_token: user.token}
      return resolve(master_ref)
    })
    .catch(e => reject(e.message))
  })
}

app.listen(port, () => {
  console.log(`Started RCD Server.js on localhost:${port}`);
});
