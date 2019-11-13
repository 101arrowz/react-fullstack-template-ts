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
        const [path, JSX, props] = route;
        return (
          <Route {...props} path={path} key={path}>
            <JSX />
          </Route>
        );
      })}
      <Route path="*">
        <Redirect to="/"/>
      </Route>
    </Switch>
  </Router>
);
export default App;
