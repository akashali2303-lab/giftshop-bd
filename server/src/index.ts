import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[GiftShop BD API] Running on http://localhost:${PORT}`);
  });
}

export default app;
