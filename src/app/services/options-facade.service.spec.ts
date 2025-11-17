import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OptionsFacadeService } from './options-facade.service';
import { OptionsService } from './options.service';

describe('OptionsFacadeService', () => {
  let service: OptionsFacadeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OptionsFacadeService, OptionsService]
    });
    service = TestBed.inject(OptionsFacadeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load breads successfully', (done) => {
    const mockBreads = [
      { id: 1, label: 'White' },
      { id: 2, label: 'Wheat' }
    ];

    // Subscribe to the list observable
    service.list$('breads').subscribe(breads => {
      if (breads.length > 0) {
        expect(breads).toEqual(mockBreads);
        done();
      }
    });

    // Subscribe to error observable to ensure no errors
    service.error$('breads').subscribe(error => {
      expect(error).toBeNull();
    });

    // Trigger the load
    service.load('breads');

    // Expect HTTP request and respond with mock data
    const req = httpMock.expectOne('/api/options/breads');
    expect(req.request.method).toBe('GET');
    req.flush(mockBreads);
  });

  it('should handle load errors gracefully', (done) => {
    // Subscribe to error observable
    service.error$('cheeses').subscribe(error => {
      if (error) {
        expect(error).toBe('Failed to load cheeses');
        done();
      }
    });

    // Subscribe to list observable to ensure empty array on error
    service.list$('cheeses').subscribe(cheeses => {
      if (cheeses.length === 0) {
        // This is expected when error occurs
      }
    });

    // Trigger the load
    service.load('cheeses');

    // Simulate HTTP error
    const req = httpMock.expectOne('/api/options/cheeses');
    req.error(new ErrorEvent('Network error'), { status: 500 });
  });

  it('should load all kinds when loadAll is called', () => {
    spyOn(service, 'load');
    
    service.loadAll();
    
    expect(service.load).toHaveBeenCalledWith('breads');
    expect(service.load).toHaveBeenCalledWith('cheeses');
    expect(service.load).toHaveBeenCalledWith('dressings');
    expect(service.load).toHaveBeenCalledWith('meats');
    expect(service.load).toHaveBeenCalledWith('toppings');
    expect(service.load).toHaveBeenCalledTimes(5);
  });

  it('should retry loading when retry is called', () => {
    spyOn(service, 'load');
    
    service.retry('breads');
    
    expect(service.load).toHaveBeenCalledWith('breads');
  });

  it('should handle timeout errors', (done) => {
    // Subscribe to error observable
    service.error$('meats').subscribe(error => {
      if (error) {
        expect(error).toBe('Failed to load meats');
        done();
      }
    });

    // Trigger the load
    service.load('meats');

    // Let the request timeout (don't respond within 5 seconds)
    const req = httpMock.expectOne('/api/options/meats');
    // Don't flush - let it timeout
    // The timeout operator should catch this and emit an error
  });
});