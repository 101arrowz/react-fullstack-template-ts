import { useEffect, useState } from 'react';
export default (): boolean => {
  const [lastVal, refresh] = useState(false);
  useEffect(() => refresh(!lastVal), [navigator.onLine]);
  return !navigator.onLine;
};
