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
    </div>
    </BrowserRouter>
      </div>
    );
  }
}

const InvitePage = () => {
  return <div>Invite</div>
}
const LoggedIn = () => {
  return <div>Logged In!</div>
}
const HomePage = () => {
  return <a href="http://localhost:5000/login">Login</a>
}
export default App;
