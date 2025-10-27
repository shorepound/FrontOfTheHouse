// Zone.js is required for Angular when running with the default change detection
// on the server. Import the Node build for SSR.
import 'zone.js/node';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;
