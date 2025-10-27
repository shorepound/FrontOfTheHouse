import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AuthInterceptor } from './services/auth-interceptor';
import { provideClientHydration } from '@angular/platform-browser';

// Create a cache interceptor
const cacheInterceptor = (req: any, next: any) => {
  // Don't cache POST requests
  if (req.method === 'POST') {
    return next(req);
  }
  
  // Add cache control headers for GET requests
  const modified = req.clone({
    setHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  return next(modified);
};

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(FormsModule),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideRouter(routes),
    provideAnimations(),
    provideClientHydration()
  ]
};

// Register the interceptor so HttpClient calls get the Authorization header automatically
export const httpProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];
