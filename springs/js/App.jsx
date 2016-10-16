import React, {Component} from 'react';
import Canvas from './Canvas.jsx';
import {render} from 'react-dom';

class App extends Component {
  render() {
    return (
      <Canvas />
    );
  }
}

render(
  <App />,
  document.getElementById('root')
);
