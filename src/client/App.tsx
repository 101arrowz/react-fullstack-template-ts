import React from 'react';
import routes from './routes';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from 'react-router-dom';
const App: React.FC = () => (
  <Router>
    <Switch>
      {routes.map(route => {
        const [path, Element] = route;
        return (
          <Route path={path} key={path}>
            <Element />
          </Route>
        );
      })}
      <Route path="*">
        <Redirect to="/" />
      </Route>
    </Switch>
  </Router>
);
export default App;
