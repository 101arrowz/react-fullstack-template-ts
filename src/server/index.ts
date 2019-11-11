import express from './util/customExpress';
import cookieParser from 'cookie-parser';
import { addAuthRoutes, authorize } from './util/auth';
/**
 * Creates the server.
 */
const createApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser()); // Could use signed cookies, but the JWT itself has a signature; unncessary
  addAuthRoutes(app);
  app.get('/', authorize, (req, res) => {
    res.success({
      data: 'Hello world!'
    });
  });
  return app;
};

if (!module.parent) {
  const PORT = parseInt(process.env.PORT || '3000');
  console.log(`Starting server on http://localhost:${PORT}`);
  createApp().listen(PORT);
}
export default createApp;
