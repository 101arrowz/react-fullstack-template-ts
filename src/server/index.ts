import express from './util/customExpress';
import cookieParser from 'cookie-parser';
import { addAuthRoutes, authorize } from './util/auth';
import db, { DB } from './util/db';
import allowed from './util/misc/allowed';
import { Identifier, User } from '../common/apiTypes';

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
  app.get('/resolve', async (req, res) => {
    const { _id: requester } = req.jwt!;
    const resolve: Identifier[] = req.body;
    const users = await Promise.all<User | void>(resolve.map(v => v.startsWith('user-') ? db.user.resolve(v) : undefined));
    
    const resolved = await Promise.all<unknown>(resolve.map(async id => {
      const type = id.split('-')[0] as keyof typeof db;
      if (type === 'user') return;
      const searchDB = db[type];
      const data = searchDB && await searchDB.resolve(id);
      if (data) {
        const ind = resolve.indexOf(data.owner as string);
        return allowed(data, requester as Identifier<User>, ind === -1 ? undefined : (users[ind] as User))
      }
    }));
    for (let i = 0; i < resolved.length; ++i) {
      if (typeof resolved[i] === 'undefined' && typeof users[i] !== 'undefined')
        resolved[i] = await allowed((users[i] as User).profile, requester as Identifier<User>, users[i] as User);
    }
    res.json(resolved);
  })
  app.get('/user/:id', (req, res) => {
    const { _id } = req.jwt!;
    db.user
      .search({
        username: req.params.id
      })
      .then(
        async user =>
          user
            ? res.success(await allowed(user.profile, _id as string) || undefined)
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
