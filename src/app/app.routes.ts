import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: 'sandwiches', loadComponent: () => import('./components/sandwich-list').then(m => m.SandwichList) },
	{ path: 'builder', loadComponent: () => import('./components/builder-form').then(m => m.BuilderForm) },
	{ path: '', redirectTo: '/sandwiches', pathMatch: 'full' }
];
