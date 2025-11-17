import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { BuilderForm } from './builder-form';
import { OptionsService } from '../services/options.service';
import { OptionsFacadeService } from '../services/options-facade.service';
import { SandwichService } from '../services/sandwich.service';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';

describe('BuilderForm', () => {
  let component: BuilderForm;
  let fixture: ComponentFixture<BuilderForm>;
  let mockOptionsService: jasmine.SpyObj<OptionsService>;
  let mockOptionsFacade: jasmine.SpyObj<OptionsFacadeService>;
  let mockSandwichService: jasmine.SpyObj<SandwichService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create spies
    mockOptionsService = jasmine.createSpyObj('OptionsService', ['list']);
    mockOptionsFacade = jasmine.createSpyObj('OptionsFacadeService', ['list$', 'error$', 'loadAll', 'retry']);
    mockSandwichService = jasmine.createSpyObj('SandwichService', ['create', 'update', 'get', 'list']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUserId']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Setup facade spies to return observables
    mockOptionsFacade.list$.and.returnValue(of([]));
    mockOptionsFacade.error$.and.returnValue(of(null));

    const mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: () => null
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [BuilderForm, HttpClientTestingModule],
      providers: [
        { provide: OptionsService, useValue: mockOptionsService },
        { provide: OptionsFacadeService, useValue: mockOptionsFacade },
        { provide: SandwichService, useValue: mockSandwichService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderForm);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty options arrays', () => {
    expect(component.breads).toEqual([]);
    expect(component.cheeses).toEqual([]);
    expect(component.dressings).toEqual([]);
    expect(component.meats).toEqual([]);
    expect(component.toppings).toEqual([]);
  });

  it('should call loadAll on options facade during initialization', () => {
    spyOn(component, 'ngOnInit').and.callThrough();
    
    component.ngOnInit();
    
    expect(mockOptionsFacade.loadAll).toHaveBeenCalled();
  });

  it('should subscribe to all option types', () => {
    component.ngOnInit();
    
    expect(mockOptionsFacade.list$).toHaveBeenCalledWith('breads');
    expect(mockOptionsFacade.list$).toHaveBeenCalledWith('cheeses');
    expect(mockOptionsFacade.list$).toHaveBeenCalledWith('dressings');
    expect(mockOptionsFacade.list$).toHaveBeenCalledWith('meats');
    expect(mockOptionsFacade.list$).toHaveBeenCalledWith('toppings');
    
    expect(mockOptionsFacade.error$).toHaveBeenCalledWith('breads');
    expect(mockOptionsFacade.error$).toHaveBeenCalledWith('cheeses');
    expect(mockOptionsFacade.error$).toHaveBeenCalledWith('dressings');
    expect(mockOptionsFacade.error$).toHaveBeenCalledWith('meats');
    expect(mockOptionsFacade.error$).toHaveBeenCalledWith('toppings');
  });

  it('should retry individual lists using facade', () => {
    component.retryList('breads');
    expect(mockOptionsFacade.retry).toHaveBeenCalledWith('breads');
    
    component.retryList('cheeses');
    expect(mockOptionsFacade.retry).toHaveBeenCalledWith('cheeses');
  });

  it('should validate form submission requirements', () => {
    // Initially should not be submittable
    expect(component.canSubmit()).toBeFalsy();
    
    // Set required fields
    component.selected.name = 'Test Sandwich';
    component.selected.breadId = 1;
    component.selected.cheeseIds = [1];
    component.selected.dressingIds = [1];
    component.selected.meatIds = [1];
    component.selected.toppingIds = [1];
    
    expect(component.canSubmit()).toBeTruthy();
  });

  it('should handle checkbox toggles correctly', () => {
    // Test cheese toggle
    component.toggleCheese(1, true);
    expect(component.selected.cheeseIds).toContain(1);
    expect(component.selected.noCheese).toBeFalsy();
    
    component.toggleCheese(1, false);
    expect(component.selected.cheeseIds).not.toContain(1);
    
    // Test no cheese toggle
    component.toggleNoCheese(true);
    expect(component.selected.noCheese).toBeTruthy();
    expect(component.selected.cheeseIds).toEqual([]);
  });

  it('should generate selection summary correctly', () => {
    component.breads = [{ id: 1, label: 'White' }];
    component.selected.breadId = 1;
    component.selected.name = 'Test Sandwich';
    
    const summary = component.selectionSummary;
    
    expect(summary).toContain(jasmine.objectContaining({
      name: 'Bread',
      values: ['White']
    }));
    expect(summary).toContain(jasmine.objectContaining({
      name: 'Name',
      values: ['Test Sandwich']
    }));
  });
});