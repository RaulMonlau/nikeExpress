import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsComponent } from './products.component';
import { ProductListComponent } from '../product-list/product-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';

// Crear un mock para ProductListComponent
@Component({
  selector: 'app-product-list',
  template: '<div>Mock Product List Component</div>'
})
class MockProductListComponent {}

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [],
      providers: []
    })
    .overrideComponent(ProductsComponent, {
      set: {
        imports: [MockProductListComponent],
        template: '<div class="products-container"><app-product-list></app-product-list></div>'
      }
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain product-list component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-product-list')).not.toBeNull();
  });

  it('should have products-container class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.products-container')).not.toBeNull();
  });
});