import express from './util/customExpress';
import cookieParser from 'cookie-parser';
import { addAuthRoutes, authorize } from './util/auth';
import { userDB } from './util/db';
import allowed from './util/misc/allowed';

/**
 * Creates the server.
 */
const createApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser()); // Could use signed cookies, but the JWT itself has a signature; unncessary
  addAuthRoutes(app);
  app.use(authorize);
  app.get('/user/:id', (req, res) => {
    const { _id } = req.jwt!;
    userDB
      .search({
        username: req.params.id
      })
      .then(
        user =>
          user
            ? res.success(allowed(user.profile, _id as string))
            : res.err('USERNAME_NOT_FOUND'),
        () => res.err('UNKNOWN')
      );
  });
  return app;
};

if (!module.parent) {
  const PORT = parseInt(process.env.PORT || '3000');
  console.log(`Starting server on http://localhost:${PORT}`);
  createApp().listen(PORT);
}
export default createApp;
