import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsSubject = new BehaviorSubject<any[]>([]);
  products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadProducts();
  }

  get products(): any[] {
    return this.productsSubject.getValue();
  }

  loadProducts(): void {
    this.http.get<any[]>('/api/productos')
      .subscribe({
        next: (data) => {
          // Transformar los datos para mantener la estructura actual
          const formattedProducts = data.map(product => ({
            id: product.id,
            reference: product.referencia,
            name: product.nombre,
            description: product.descripcion,
            price: product.precio,
            stock: product.stock,
            productType: product.tipo,
            offer: product.oferta === 1,
            productImageData: product.imagen
          }));
          this.productsSubject.next(formattedProducts);
        },
        error: (error) => {
          console.error('Error cargando productos:', error);
        }
      });
  }

  addProduct(product: any): Observable<any> {
    const apiProduct = {
      referencia: product.reference,
      nombre: product.name,
      descripcion: product.description,
      precio: product.price,
      stock: product.stock || 0,
      tipo: product.productType,
      oferta: product.offer ? 1 : 0,
      imagen: product.productImageData
    };

    return this.http.post('/api/productos', apiProduct).pipe(
      tap(() => this.loadProducts())
    );
  }

  updateProduct(product: any): Observable<any> {
    const apiProduct = {
      referencia: product.reference,
      nombre: product.name,
      descripcion: product.description,
      precio: product.price,
      stock: product.stock || 0,
      tipo: product.productType,
      oferta: product.offer ? 1 : 0,
      imagen: product.productImageData
    };

    // Buscar el ID del producto en el conjunto actual
    const existingProduct = this.products.find(p => p.reference === product.reference);
    if (!existingProduct) {
      throw new Error('Producto no encontrado');
    }

    return this.http.put(`/api/productos/${existingProduct.id}`, apiProduct).pipe(
      tap(() => this.loadProducts())
    );
  }


  deleteProduct(productId: string): Observable<any> {
    return this.http.delete(`/api/productos/${productId}`).pipe(
      tap(() => this.loadProducts())
    );
  }
}