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
        <BrowserRouter>
        <div className="container">
      <Route path="/" exact component={HomePage} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/loggedin" component={LoggedIn} />
      <Route path="/alreadyHosted" component={alreadyHosted} />
      <Route path="/guestLoggedIn" component={LoggedIn} />
      <Route path="/error" component={Error} />
    </div>
    </BrowserRouter>
      </div>
    );
  }
}

const InvitePage = () => {
  return <a style={{textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/invite`}>Login to Spotify and join the party</a>
}
const LoggedIn = () => {
  return <div id="links" style={{textDecoration:'none', color: 'white'}}>Logged In!</div>
}
const alreadyHosted = () => {
  return <div id="links">
    <div style={{color:'red'}} >There is already a host</div>
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/invite`}>Login and join existing room </a><br />
  </div>
}
const HomePage = () => {
  return (
    <div id="links">
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/login`}>Login to Spotify and host </a><br />
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/invite`}>Login and join existing </a><br />
    </div>
  );
}

const Error = () => {

  const message = window.location.search.slice(window.location.search.indexOf('=') + 1, window.location.search.length)
  return <div><br /><div style={{color: 'red'}}>Error logging into Spotify {message.split('_').join(' ')}</div></div>
}
export default App;
