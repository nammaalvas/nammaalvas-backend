import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load swagger.yaml
const file = fs.readFileSync(path.resolve(__dirname, '../swagger.yaml'), 'utf8');
const swaggerDocument = yaml.parse(file);

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📄 Swagger docs available at /api-docs');
};
