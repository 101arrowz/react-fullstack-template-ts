import express from './util/customExpress';
import cookieParser from 'cookie-parser';
import { addAuthRoutes, authorize } from './util/auth';
import db from './util/db';
import allowed from './util/misc/allowed';
import {
  Identifier,
  User,
  Profile,
  RestrictionLevel,
  DM,
  Comment,
  Post
} from '../common/apiTypes';

const RESTRICTIONS = ['all', 'friends', 'owner'] as RestrictionLevel[];

/**
 * Creates a new object by merging an object with extra parameters
 * @param obj The original object
 * @param val The values to assign
 * @returns The new object
 */
const assign = <T>(obj: T, val: { [k in keyof T]?: T[k] }): T => {
  const newObj = { ...obj };
  for (const k of Object.keys(val) as (keyof T)[]) {
    if (typeof val[k] !== 'undefined') newObj[k] = val[k]!;
  }
  return newObj;
};

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
    const users = await Promise.all<User | void>(
      resolve.map(v => (v.startsWith('user') ? db.user.resolve(v) : undefined))
    );

    const resolved = await Promise.all<unknown>(
      resolve.map(async id => {
        const type = id.split('/')[0] as keyof typeof db;
        if (type === 'user') return;
        const searchDB = db[type];
        const data = searchDB && (await searchDB.resolve(id));
        if (data) {
          const ind = resolve.indexOf(data.owner as string);
          return allowed(
            data,
            requester as Identifier<User>,
            ind === -1 ? undefined : (users[ind] as User)
          );
        }
      })
    );
    for (let i = 0; i < resolved.length; ++i) {
      if (typeof resolved[i] === 'undefined' && typeof users[i] !== 'undefined')
        resolved[i] = await allowed(
          (users[i] as User).profile,
          requester as Identifier<User>,
          users[i] as User
        );
    }
    res.json(resolved);
  });
  app.get('/user/:id', (req, res) => {
    const { _id } = req.jwt!;
    db.user
      .search({
        username: req.params.id
      })
      .then(
        async user =>
          user
            ? res.success(
                (await allowed(user.profile, _id as string, user)) || undefined
              )
            : res.err('USERNAME_NOT_FOUND'),
        () => res.err('UNKNOWN')
      );
  });
  app.route('/manage/:type').patch(async (req, res) => {
    const { _id: userID } = req.jwt!;
    switch (req.params.type) {
      case 'profile': {
        const { name, bio, icon, restrictionLevel } = req.body as {
          name: string;
          bio: string;
          icon: string;
          restrictionLevel: number;
        };
        const account = await db.user.resolve(userID as string);
        if (!account) res.err('INVALID_IDENTIFIER');
        else {
          const restrictedTo = RESTRICTIONS[restrictionLevel];
          if (typeof restrictedTo === 'undefined')
            delete account.profile.restrictedTo;
          account.profile = assign(account.profile, {
            name,
            bio,
            icon,
            restrictedTo
          }) as Profile;
          db.user.overwrite(userID as string, account).then(
            val =>
              val
                ? res.success(
                    allowed(
                      account.profile as Profile,
                      userID as string,
                      account
                    )
                  )
                : res.err('UNKNOWN'),
            () => res.err('UNKNOWN')
          );
        }
        break;
      }
      case 'post': {
        const { _id, title, newContent, restrictionLevel } = req.body as {
          _id: string;
          title: string;
          newContent: string;
          restrictionLevel: number;
        };
        let post = await db.post.resolve(_id);
        if (!post) res.err('INVALID_IDENTIFIER');
        else if (post.owner !== userID) res.err('FORBIDDEN');
        else {
          const restrictedTo = RESTRICTIONS[restrictionLevel];
          if (typeof restrictedTo === 'undefined') delete post.restrictedTo;
          const lastEdit = post.content[post.content.length - 1].value;
          post = assign(post, {
            title,
            restrictedTo,
            content:
              newContent || title
                ? post.content.concat({
                    value: [title || lastEdit[0], newContent || lastEdit[1]],
                    date: new Date()
                  })
                : post.content
          });
          db.post.overwrite(_id as string, post).then(
            val =>
              val
                ? res.success(allowed(post as Post, userID as string))
                : res.err('UNKNOWN'),
            () => res.err('UNKNOWN')
          );
        }
        break;
      }
      case 'comment': {
        const { _id, newContent, restrictionLevel } = req.body as {
          _id: string;
          newContent: string;
          restrictionLevel: number;
        };
        let comment = await db.comment.resolve(_id);
        if (!comment) res.err('INVALID_IDENTIFIER');
        else if (comment.owner !== userID) res.err('FORBIDDEN');
        else {
          const restrictedTo = RESTRICTIONS[restrictionLevel];
          if (typeof restrictedTo === 'undefined') delete comment.restrictedTo;
          comment = assign(comment, {
            restrictedTo,
            content: newContent
              ? comment.content.concat({
                  value: newContent,
                  date: new Date()
                })
              : comment.content
          });
          db.comment.overwrite(_id as string, comment).then(
            val =>
              val
                ? res.success(allowed(comment as Comment, userID as string))
                : res.err('UNKNOWN'),
            () => res.err('UNKNOWN')
          );
        }
        break;
      }
      case 'dm': {
        const { _id, newContent, read } = req.body as {
          _id: string;
          newContent: string;
          read: boolean;
        };
        let dm = await db.dm.resolve(_id);
        if (!dm) res.err('INVALID_IDENTIFIER');
        else if (dm.owner !== userID) res.err('FORBIDDEN');
        else {
          dm = assign(dm, {
            read,
            content: newContent
              ? dm.content.concat({
                  value: newContent,
                  date: new Date()
                })
              : dm.content
          });
          db.dm.overwrite(_id as string, dm).then(
            val =>
              val
                ? res.success(allowed(dm as DM, userID as string))
                : res.err('UNKNOWN'),
            () => res.err('UNKNOWN')
          );
        }
        break;
      }
      default: {
        res.status(404);
      }
    }
  });
  return app;
};

if (!module.parent) {
  const PORT = parseInt(process.env.PORT || '3000');
  console.log(`Starting server on http://localhost:${PORT}`);
  createApp().listen(PORT);
}
export default createApp;
