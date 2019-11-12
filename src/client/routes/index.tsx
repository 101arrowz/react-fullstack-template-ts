import Home from './Home';
import { RouteProps } from 'react-router';

const routes: [string, React.FC, RouteProps?][] = [['/', Home, {exact: true}]];
export default routes;
