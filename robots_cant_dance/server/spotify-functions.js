/*jshint esversion: 6 */

module.exports = {

    getUserOptions: (user) => {
        return {
            method: 'GET',
            uri: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true
        };
    },

    getPlaybackOptions: (user) => {
        return {
            uri: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: {
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true
        };
    },

    playTrack: (user, track) => {
        return {
            method: 'PUT',
            uri: 'https://api.spotify.com/v1/me/player/play',
            body: {
                "context_uri": track.uri,
                "position_ms": track.position
            },
            headers: {
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true
        };
    },

    setPlaybackOptions: (user, master) => {
        console.log('HERE IS THE MASTER!', master)

        return {
            method: 'PUT',
            uri: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true,
            body: {
                "context_uri": master.track_uri,
                "offset": {
                    "position": 1
                },
                "position_ms": master.play_position
            }
        };
    },

    authOptions: (redirect_uri, code) => {
        return {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };
    }

};