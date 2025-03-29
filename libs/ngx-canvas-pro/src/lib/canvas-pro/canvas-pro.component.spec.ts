import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasProComponent } from './canvas-pro.component';

describe('CanvasProComponent', () => {
  let component: CanvasProComponent;
  let fixture: ComponentFixture<CanvasProComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasProComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasProComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
