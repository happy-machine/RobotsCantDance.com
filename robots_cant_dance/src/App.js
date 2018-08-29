import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom'
import './App.css';
const PORT = 5000;

class App extends Component {
  render() {
    return (
      <div className="App" >
        <BrowserRouter>
        <div className="container">
      <Route path="/" exact component={HomePage} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/loggedin" component={LoggedIn} />
      <Route path="/error" component={Error('Error logging in to Spotify')} />
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
  return <div style={{textDecoration:'none', color: 'white'}}>Logged In!</div>
}
const HomePage = () => {
  return (
    <div id="links">
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/login`}>Login to Spotify and host </a><br />
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/invite`}>Login and join </a><br />
    <a style={{lineHeight: '10px', marginBottom: '10px', textDecoration:'none', color: 'white'}} href={`http://localhost:${PORT}/start`}>Start sync </a><br />
    </div>
  );
}

const Error = (message) => {
  return <div style={{color: 'red'}}>Error logging into Spotify {message}</div>
}
export default App;
