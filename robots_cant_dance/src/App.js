import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom'
import './App.css';
import axios from 'axios';
const PORT = 5000;

class App extends Component {
  render() {
    return (
      <div className="App" >
        <header className="App-header">
          <h1 className="App-title">Test</h1>
        </header>
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
  return <a style={{textDecoration:'none', color: 'white'}} href="http://localhost:5000/invite">Login to Spotify</a>
}
const LoggedIn = () => {
  return <div style={{textDecoration:'none', color: 'white'}}>Logged In!</div>
}
const HomePage = () => {
  return <a style={{textDecoration:'none', color: 'white'}} href="http://localhost:5000/login">Login to Spotify</a>
}
const Error = (message) => {
  return <div style={{color: 'red'}}>Error logging into Spotify</div>
}
export default App;
