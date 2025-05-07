import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductListComponent } from './product-list.component';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth-service.service';
import { CartService } from '../../services/cart.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  
  const mockProducts = [
    {
      id: 1,
      reference: 'REF001',
      name: 'Zapatillas Test',
      description: 'Zapatillas para test',
      price: 99.99,
      stock: 10,
      productType: 'calzado',
      offer: true,
      productImageData: 'data:image/test'
    },
    {
      id: 2,
      reference: 'REF002',
      name: 'Camiseta Test',
      description: 'Camiseta para test',
      price: 29.99,
      stock: 0,
      productType: 'ropa',
      offer: false,
      productImageData: ''
    }
  ];

  beforeEach(async () => {
    const productsSpy = jasmine.createSpyObj('ProductService', ['loadProducts', 'deleteProduct']);
    const productsSubject = new BehaviorSubject<any[]>(mockProducts);
    productsSpy.products$ = productsSubject.asObservable();
    
    const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'isAdmin']);
    // Mock para currentUser$
    authSpy.currentUser$ = new BehaviorSubject(null).asObservable();
    
    const cartSpy = jasmine.createSpyObj('CartService', ['addToCart']);

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [],
      providers: [
        { provide: ProductService, useValue: productsSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: CartService, useValue: cartSpy }
      ]
    }).compileComponents();

    productServiceSpy = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    cartServiceSpy = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', () => {
    expect(productServiceSpy.loadProducts).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should check admin status on init', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    component.ngOnInit();
    expect(component.isAdmin).toBeTrue();
  });

  it('should check if product is out of stock', () => {
    const inStockProduct = mockProducts[0];
    const outOfStockProduct = mockProducts[1];
    
    expect(component.isOutOfStock(inStockProduct)).toBeFalse();
    expect(component.isOutOfStock(outOfStockProduct)).toBeTrue();
  });

  it('should show error if trying to add to cart when not logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(false);
    
    component.addToCart(mockProducts[0]);
    
    expect(cartServiceSpy.addToCart).not.toHaveBeenCalled();
    expect(component.error).toBe('Debes iniciar sesión para añadir productos al carrito');
  });

  it('should add product to cart successfully when logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);
    cartServiceSpy.addToCart.and.returnValue(of({}));
    
    component.addToCart(mockProducts[0]);
    
    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(mockProducts[0]);
    expect(component.addToCartSuccess).toBe('Zapatillas Test añadido al carrito');
    expect(component.error).toBeNull();
  });

  it('should handle error when adding to cart fails', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);
    const error = { error: { error: 'Error al añadir al carrito' } };
    cartServiceSpy.addToCart.and.returnValue(throwError(() => error));
    
    component.addToCart(mockProducts[0]);
    
    expect(cartServiceSpy.addToCart).toHaveBeenCalled();
    expect(component.addToCartSuccess).toBeNull();
    expect(component.error).toBe('Error al añadir al carrito');
  });

  it('should delete product when admin and confirm', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    spyOn(window, 'confirm').and.returnValue(true);
    productServiceSpy.deleteProduct.and.returnValue(of({}));
    
    component.deleteProduct(1);
    
    expect(productServiceSpy.deleteProduct).toHaveBeenCalledWith('1');
    expect(productServiceSpy.loadProducts).toHaveBeenCalled();
  });

  it('should not delete product when canceling confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    
    component.deleteProduct(1);
    
    expect(productServiceSpy.deleteProduct).not.toHaveBeenCalled();
  });

  it('should handle error when deleting product fails', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    spyOn(window, 'confirm').and.returnValue(true);
    productServiceSpy.deleteProduct.and.returnValue(throwError(() => new Error('Error al eliminar')));
    
    component.deleteProduct(1);
    
    expect(productServiceSpy.deleteProduct).toHaveBeenCalled();
    expect(component.error).toBe('Error al eliminar el producto');
  });
});