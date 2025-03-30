import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxPortVComponent } from './ngx-port-v.component';

describe('NgxPortVComponent', () => {
  let component: NgxPortVComponent;
  let fixture: ComponentFixture<NgxPortVComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxPortVComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxPortVComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
