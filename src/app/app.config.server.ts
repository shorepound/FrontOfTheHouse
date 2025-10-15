import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideClientHydration } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// Enable server rendering and client-side hydration for development and production
// so the client can hydrate the server-rendered DOM during dev cycles.
const serverProviders = [
  provideServerRendering(withRoutes(serverRoutes)),
  // Ensure the server emits serialized hydration metadata so the client-side
  // bootstrap can hydrate the server-rendered DOM. See NG0505 when missing.
  provideClientHydration()
];

const serverConfig: ApplicationConfig = {
  providers: serverProviders
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
