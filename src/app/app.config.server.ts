import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// During local development SSR can interfere with hydration and cause
// confusing behaviour; only enable server rendering in production builds.
const serverProviders = (process.env['NODE_ENV'] === 'production') ? [
  provideServerRendering(withRoutes(serverRoutes))
] : [];

const serverConfig: ApplicationConfig = {
  providers: serverProviders
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
