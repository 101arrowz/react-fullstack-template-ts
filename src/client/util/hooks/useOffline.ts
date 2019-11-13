import { useEffect, useState } from 'react';
export default () => {
  const [lastVal, refresh] = useState(false);
  useEffect(() => refresh(!lastVal), [navigator.onLine]);
  return !navigator.onLine;
}