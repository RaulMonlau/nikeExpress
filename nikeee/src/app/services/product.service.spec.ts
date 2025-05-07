import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService]
    });
    
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Manejar la solicitud GET inicial que se realiza en el constructor
    httpMock.expectOne('/api/productos').flush([]);
  });

  afterEach(() => {
    httpMock.verify(); // Verifica que no haya solicitudes pendientes
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load products from API', () => {
    // Llamar explícitamente a loadProducts para probar la función
    service.loadProducts();
    
    // Interceptar la solicitud que se realiza al llamar a loadProducts
    const req = httpMock.expectOne('/api/productos');
    expect(req.request.method).toBe('GET');
    
    // Responder con datos de prueba
    const mockProducts = [
      {
        id: 1,
        referencia: 'REF001',
        nombre: 'Zapatillas Test',
        descripcion: 'Descripción test',
        precio: 99.99,
        stock: 10,
        tipo: 'calzado',
        oferta: 1,
        imagen: 'test-image.jpg'
      }
    ];
    req.flush(mockProducts);
    
    // Verificar que los productos se transformaron correctamente
    service.products$.subscribe(products => {
      expect(products.length).toBe(1);
      expect(products[0].id).toBe(1);
      expect(products[0].reference).toBe('REF001');
      expect(products[0].name).toBe('Zapatillas Test');
      expect(products[0].offer).toBeTrue();
    });
  });

  it('should add product via API', () => {
    const mockNewProduct = {
      reference: 'REF002',
      name: 'Nuevo Producto',
      description: 'Descripción del nuevo producto',
      price: 129.99,
      stock: 5,
      productType: 'ropa',
      offer: true,
      productImageData: 'data:image/test'
    };
    
    const mockResponse = { 
      mensaje: 'Producto agregado correctamente',
      id: 2
    };

    // Llamar al método addProduct
    service.addProduct(mockNewProduct).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    // Verificar la solicitud POST
    const req = httpMock.expectOne('/api/productos');
    expect(req.request.method).toBe('POST');
    
    // Verificar el cuerpo de la solicitud
    expect(req.request.body).toEqual({
      referencia: 'REF002',
      nombre: 'Nuevo Producto',
      descripcion: 'Descripción del nuevo producto',
      precio: 129.99,
      stock: 5,
      tipo: 'ropa',
      oferta: 1,
      imagen: 'data:image/test'
    });
    
    // Responder a la solicitud POST
    req.flush(mockResponse);
    
    // Verificar que loadProducts es llamado después de añadir
    const reloadReq = httpMock.expectOne('/api/productos');
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush([]);
  });

  it('should update product via API', () => {
    // Configurar datos de productos iniciales
    service['productsSubject'].next([
      {
        id: 1,
        reference: 'REF001',
        name: 'Producto Original',
        description: 'Descripción original',
        price: 99.99,
        stock: 10,
        productType: 'calzado',
        offer: false,
        productImageData: 'original-image.jpg'
      }
    ]);
    
    const mockUpdateProduct = {
      reference: 'REF001',
      name: 'Producto Actualizado',
      description: 'Descripción actualizada',
      price: 149.99,
      stock: 15,
      productType: 'calzado',
      offer: false,
      productImageData: 'data:image/updated'
    };
    
    const mockResponse = { mensaje: 'Producto actualizado correctamente' };

    // Llamar al método updateProduct
    service.updateProduct(mockUpdateProduct).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    // Verificar la solicitud PUT
    const req = httpMock.expectOne('/api/productos/1');
    expect(req.request.method).toBe('PUT');
    
    // Verificar el cuerpo de la solicitud
    expect(req.request.body).toEqual({
      referencia: 'REF001',
      nombre: 'Producto Actualizado',
      descripcion: 'Descripción actualizada',
      precio: 149.99,
      stock: 15,
      tipo: 'calzado',
      oferta: 0,
      imagen: 'data:image/updated'
    });
    
    // Responder a la solicitud PUT
    req.flush(mockResponse);
    
    // Verificar que loadProducts es llamado después de actualizar
    const reloadReq = httpMock.expectOne('/api/productos');
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush([]);
  });

  it('should delete product via API', () => {
    const productId = '1';
    const mockResponse = { mensaje: 'Producto eliminado correctamente' };

    // Llamar al método deleteProduct
    service.deleteProduct(productId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    // Verificar la solicitud DELETE
    const req = httpMock.expectOne(`/api/productos/${productId}`);
    expect(req.request.method).toBe('DELETE');
    
    // Responder a la solicitud DELETE
    req.flush(mockResponse);
    
    // Verificar que loadProducts es llamado después de eliminar
    const reloadReq = httpMock.expectOne('/api/productos');
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush([]);
  });

  it('should handle error when product reference not found for update', () => {
    // Configurar datos de productos iniciales
    service['productsSubject'].next([
      {
        id: 1,
        reference: 'REF001',
        name: 'Producto Original',
        description: 'Descripción original',
        price: 99.99,
        stock: 10,
        productType: 'calzado',
        offer: false,
        productImageData: 'original-image.jpg'
      }
    ]);
    
    const nonExistentRef = {
      reference: 'NON_EXISTENT',
      name: 'Producto Inexistente',
      price: 99.99,
      description: '',
      stock: 0,
      productType: '',
      offer: false,
      productImageData: ''
    };

    expect(() => service.updateProduct(nonExistentRef)).toThrow(new Error('Producto no encontrado'));
  });
});