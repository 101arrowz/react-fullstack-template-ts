import { render } from 'react-dom';
import React from 'react';
import App from './App';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', (): void => {
    navigator.serviceWorker.register('./sw.ts').then(reg => {
      if (reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.installing?.state === 'installed')
            console.log(
              'Installed service worker. Offline functionality now available!'
            );
        });
      }
      reg.addEventListener('updatefound', () => {
        console.log('App update found!');
      });
    });
  });
}
render(<App />, document.getElementById('root'));
