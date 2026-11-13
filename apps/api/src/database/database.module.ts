import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { connectDatabase, DATABASE, type DatabaseConnection } from './database.js';

const CONNECTION = Symbol('DATABASE_CONNECTION');

@Global()
@Module({
  providers: [
    {
      provide: CONNECTION,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => connectDatabase(config.database),
    },
    {
      provide: DATABASE,
      inject: [CONNECTION],
      useFactory: (connection: DatabaseConnection) => connection.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(CONNECTION) private readonly connection: DatabaseConnection) {}

  async onApplicationShutdown() {
    await this.connection.close();
  }
}
