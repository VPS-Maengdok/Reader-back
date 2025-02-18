import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);

  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'MaengdokReaderBack_',
      logLevels: ['log', 'warn', 'error'],
    }),
  });

  const dataSource: DataSource = app.get(DataSource);

  let isDbReady = false;
  while (!isDbReady) {
    try {
      await dataSource.query('SELECT 1');
      isDbReady = true;
    } catch (error) {
      logger.error('Database not ready yet, retrying in 5 seconds...');
      logger.error('The error displayed: ', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const sqlPath = path.resolve(__dirname, '..', 'init.sql');
  if (fs.existsSync(sqlPath)) {
    try {
      let sql = fs.readFileSync(sqlPath, 'utf8');

      sql = sql.replace(
        /\${ADMIN_USERNAME}/g,
        process.env.ADMIN_USERNAME || 'admin',
      );
      sql = sql.replace(
        /\${ADMIN_PASSWORD}/g,
        process.env.ADMIN_PASSWORD || 'password',
      );

      await dataSource.query(sql);
      logger.log('✅  init.sql executed successfully.');
    } catch (error) {
      logger.error('❌  Error executing init.sql:', error);
    }
  } else {
    logger.warn('⚠️  init.sql file not found, skipping.');
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
