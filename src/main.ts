/// <reference types="@angular/localize" />

import 'zone.js';  // Add Zone.js to enable Angular's change detection
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
