import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import supplementsRoutes from './modules/supplements/routes.js';
import athletesRoutes from './modules/athletes/routes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/supplements', supplementsRoutes);
app.use('/api/athletes', athletesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
