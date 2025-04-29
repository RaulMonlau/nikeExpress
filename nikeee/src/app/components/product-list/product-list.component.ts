import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth-service.service';
import { CartService } from '../../services/cart.service';
import { Observable } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  imports: [CommonModule, HttpClientModule]
})
export class ProductListComponent implements OnInit {
  products$: Observable<any[]>;
  loading: boolean = true;
  error: string | null = null;
  isAdmin: boolean = false;
  addToCartSuccess: string | null = null;

  constructor(
    private productService: ProductService, 
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.products$ = this.productService.products$;
  }

  ngOnInit(): void {
    this.productService.loadProducts();
    this.isAdmin = this.authService.isAdmin();
    this.products$.subscribe({
      next: () => this.loading = false,
      error: (err) => {
        this.error = "Error cargando productos";
        this.loading = false;
        console.error("Error cargando productos:", err);
      }
    });
    
    // Suscribirse a cambios en el estado de autenticación
    this.authService.currentUser$.subscribe(user => {
      this.isAdmin = this.authService.isAdmin();
    });
  }

  deleteProduct(productId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      this.productService.deleteProduct(productId.toString()).subscribe({
        next: () => {
          // El producto se eliminó correctamente
          this.productService.loadProducts();
        },
        error: (error) => {
          console.error('Error al eliminar el producto:', error);
          this.error = 'Error al eliminar el producto';
        }
      });
    }
  }
  
  addToCart(product: any): void {
    if (!this.authService.isLoggedIn()) {
      this.error = "Debes iniciar sesión para añadir productos al carrito";
      return;
    }
    
    this.error = null;
    this.addToCartSuccess = null;
    
    try {
      this.cartService.addToCart(product).subscribe({
        next: () => {
          this.addToCartSuccess = `${product.name} añadido al carrito`;
          setTimeout(() => this.addToCartSuccess = null, 3000);
        },
        error: (err) => {
          console.error('Error al añadir al carrito:', err);
          this.error = err.error?.error || 'Error al añadir al carrito';
        }
      });
    } catch (err: any) {
      this.error = err.message;
    }
  }
  
  isOutOfStock(product: any): boolean {
    return product.stock <= 0;
  }
}