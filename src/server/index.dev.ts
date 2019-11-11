import express from './util/customExpress';
import Bundler from 'parcel-bundler';
import { resolve } from 'path';
import createApp from '.';

const app = express();
const bundler = new Bundler(resolve(__dirname, '..', 'client', 'index.html'));
app.use(process.env.API_PATH || '/api', createApp());
app.use(bundler.middleware());
const PORT = parseInt(process.env.PORT || '1234');
app.listen(PORT);
bundler.on('buildEnd', () =>
  console.log(`Starting server on http://localhost:${PORT}`)
);
