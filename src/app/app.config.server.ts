import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideClientHydration } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// During local development SSR can interfere with hydration and cause
// confusing behaviour; only enable server rendering in production builds.
const serverProviders = (process.env['NODE_ENV'] === 'production') ? [
  provideServerRendering(withRoutes(serverRoutes)),
  // Ensure the server emits serialized hydration metadata so the client-side
  // bootstrap can hydrate the server-rendered DOM. See NG0505 when missing.
  provideClientHydration()
] : [];

const serverConfig: ApplicationConfig = {
  providers: serverProviders
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
