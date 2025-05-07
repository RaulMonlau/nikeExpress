import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AdminComponent } from './admin.component';
import { ProductService } from '../../services/product.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ProductService', [
      'loadProducts', 
      'addProduct', 
      'updateProduct', 
      'deleteProduct'
    ]);
    
    // Mock para products getter
    Object.defineProperty(spy, 'products', {
      get: () => [
        {
          id: 1,
          reference: 'REF001',
          name: 'Producto Test',
          description: 'Descripción del producto',
          price: 99.99,
          stock: 10,
          productType: 'calzado',
          offer: false,
          productImageData: 'data:image/test'
        }
      ]
    });

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, HttpClientTestingModule],
      declarations: [],
      providers: [
        FormBuilder,
        { provide: ProductService, useValue: spy }
      ]
    }).compileComponents();

    productServiceSpy = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.adminForm.value).toEqual({
      reference: '',
      name: '',
      price: 0,
      stock: 0,
      description: '',
      productType: '',
      offer: false,
      productImageData: ''
    });
  });

  it('should validate required fields', () => {
    const form = component.adminForm;
    
    // Inicialmente el formulario debería ser inválido porque reference y name son requeridos
    expect(form.valid).toBeFalse();
    
    // Rellenar campos obligatorios
    form.patchValue({
      reference: 'REF002',
      name: 'Producto Nuevo'
    });
    
    expect(form.valid).toBeTrue();
  });

  it('should call addProduct when submitting a new product', () => {
    const form = component.adminForm;
    const testProduct = {
      reference: 'REF002',
      name: 'Producto Nuevo',
      price: 129.99,
      stock: 5,
      description: 'Nuevo producto test',
      productType: 'ropa',
      offer: true,
      productImageData: ''
    };
    
    form.patchValue(testProduct);
    productServiceSpy.addProduct.and.returnValue(of({ id: 2, mensaje: 'Producto agregado correctamente' }));
    
    component.onSubmit();
    
    expect(productServiceSpy.addProduct).toHaveBeenCalledWith(testProduct);
    expect(component.submitSuccess).toBeTruthy();
    expect(component.submitError).toBeNull();
  });

  it('should handle error when adding a product fails', () => {
    const form = component.adminForm;
    form.patchValue({
      reference: 'REF002',
      name: 'Producto Nuevo',
      price: 129.99
    });
    
    const error = { error: { error: 'Error al agregar producto' } };
    productServiceSpy.addProduct.and.returnValue(throwError(() => error));
    
    component.onSubmit();
    
    expect(productServiceSpy.addProduct).toHaveBeenCalled();
    expect(component.submitSuccess).toBeNull();
    expect(component.submitError).toBe('Error al agregar producto');
  });

  it('should load product data when reference exists', () => {
    // Simular que se ingresa una referencia existente
    component.adminForm.patchValue({ reference: 'REF001' });
    
    // Llamar al método que busca por referencia
    component.onReferenceBlur();
    
    // Verificar que los campos se rellenaron correctamente
    expect(component.isEditing).toBeTrue();
    expect(component.adminForm.get('name')?.value).toBe('Producto Test');
    expect(component.adminForm.get('price')?.value).toBe(99.99);
    expect(component.adminForm.get('reference')?.disabled).toBeTrue();
  });

  it('should call updateProduct when submitting an existing product', () => {
    // Simular que estamos editando un producto existente
    component.isEditing = true;
    const form = component.adminForm;
    const testProduct = {
      reference: 'REF001',
      name: 'Producto Actualizado',
      price: 149.99,
      stock: 15,
      description: 'Descripción actualizada',
      productType: 'calzado',
      offer: true,
      productImageData: ''
    };
    
    form.patchValue(testProduct);
    // Deshabilitar reference como ocurre en la edición
    form.get('reference')?.disable();
    
    productServiceSpy.updateProduct.and.returnValue(of({ mensaje: 'Producto actualizado correctamente' }));
    
    component.onSubmit();
    
    expect(productServiceSpy.updateProduct).toHaveBeenCalled();
    expect(component.submitSuccess).toBeTruthy();
  });

  it('should call deleteProduct when deleting a product', () => {
    // Simular que estamos editando un producto existente
    component.isEditing = true;
    component.adminForm.patchValue({ reference: 'REF001' });
    
    productServiceSpy.deleteProduct.and.returnValue(of({ mensaje: 'Producto eliminado correctamente' }));
    
    // Mockear confirm para que retorne true
    spyOn(window, 'confirm').and.returnValue(true);
    
    component.deleteProduct();
    
    expect(productServiceSpy.deleteProduct).toHaveBeenCalledWith('REF001');
    expect(component.submitSuccess).toBeTruthy();
  });

  it('should reset form when calling resetForm', () => {
    // Rellenar el formulario con datos
    component.adminForm.patchValue({
      reference: 'REF001',
      name: 'Producto Test',
      price: 99.99
    });
    
    // Llamar a resetForm
    component.resetForm();
    
    // Verificar que el formulario se ha limpiado
    expect(component.adminForm.value).toEqual({
      reference: '',
      name: '',
      price: 0,
      stock: 0,
      description: '',
      productType: '',
      offer: false,
      productImageData: ''
    });
    expect(component.isEditing).toBeFalse();
  });
});