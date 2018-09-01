import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom'
import './App.css';
const PORT = 5000;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {date: new Date()};
  }
  render() {
    return (
      <div className="App" >
      <div id="RCD_Logo" />
        <BrowserRouter>
        <div className="container">
      <Route path="/" exact component={HomePage} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/hostLoggedin" component={hostLoggedIn} />
      <Route path="/alreadyHosted" component={alreadyHosted} />
      <Route path="/guestLoggedIn" component={guestLoggedIn} />
      <Route path="/error" component={Error} />
    </div>
    </BrowserRouter>
      </div>
    );
  }
}

const InvitePage = () => {
  return <a className="links" style={{textDecoration:'none'}} href={`http://localhost:${PORT}/invite`}>Login to Spotify and join the party</a>
}
const hostLoggedIn = () => {
  return <div className="info" >Host Logged In!</div>
}
const guestLoggedIn = () => {
  return <div className="info" >Guest Logged In!</div>
}
const alreadyHosted = () => {
  return <div className="links">
    <div style={{color:'red'}} >There is already a host</div>
    <a style={{textDecoration:'none'}} href={`http://localhost:${PORT}/invite`}>Login and join existing room </a><br />
  </div>
}
const HomePage = () => {
  return (
    <div className="links">
    <a style={{textDecoration:'none'}} href={`http://localhost:${PORT}/login`}>Login to Spotify and host </a><br />
    <a style={{textDecoration:'none'}} href={`http://localhost:${PORT}/invite`}>Login and join existing </a><br />
    </div>
  );
}

const Error = () => {

  const message = window.location.search.slice(window.location.search.indexOf('=') + 1, window.location.search.length)
  return <div><br /><div className ="error" >Error logging into Spotify {message.split('_').join(' ')}</div></div>
}
export default App;
