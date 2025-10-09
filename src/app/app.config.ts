import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
  provideBrowserGlobalErrorListeners(),
  provideZonelessChangeDetection(),
  importProvidersFrom(HttpClientModule, FormsModule),
  provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
