import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: 'sandwiches', loadComponent: () => import('./components/sandwich-list').then(m => m.SandwichList) },
	{ path: 'builder', loadComponent: () => import('./components/builder-form').then(m => m.BuilderForm) },
	{ path: 'login', loadComponent: () => import('./components/login').then(m => m.Login) },
	{ path: 'register', loadComponent: () => import('./components/register').then(m => m.Register) },
	{ path: 'forgot-password', loadComponent: () => import('./components/forgot-password').then(m => m.ForgotPassword) },
	{ path: 'dashboard', loadComponent: () => import('./components/dashboard').then(m => m.Dashboard) },
	// Landing page at root
	{ path: '', loadComponent: () => import('./components/landing').then(m => m.Landing) }
];
