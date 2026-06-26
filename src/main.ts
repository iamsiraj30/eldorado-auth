import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // setup global prefix
  app.setGlobalPrefix('/api/v1');

  // global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`localhost:${process.env.PORT}`);
}
bootstrap().catch((error) => {
  Logger.warn(error);
  process.exit(1);
});
