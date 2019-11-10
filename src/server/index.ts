import express from 'express';
import Bundler from 'parcel-bundler';
import { resolve } from 'path';
const createApp = (): express.Application => {
  const app = express();
  app.get('/', (req, res) => {
    res.send('Hello world!');
  });
  return app;
};

if (!module.parent) {
  const api = createApp();
  if (process.env.NODE_ENV === 'production') {
    const PORT = parseInt(process.env.PORT || '3000');
    console.log(`Starting server on http://localhost:${PORT}`);
    api.listen(PORT);
  } else {
    const app = express();
    const bundler = new Bundler(
      resolve(__dirname, '..', 'client', 'index.html')
    );
    app.use(process.env.API_PATH || '/api', api);
    app.use(bundler.middleware());
    const PORT = parseInt(process.env.PORT || '1234');
    app.listen(PORT);
    bundler.on('buildEnd', () =>
      console.log(`Starting server on http://localhost:${PORT}`)
    );
  }
}
export default createApp;
