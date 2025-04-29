import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartTimeoutSubject = new BehaviorSubject<number | null>(null);
  private cartId: string | null = null;
  private cartTimer: any;

  public cartItems$ = this.cartItemsSubject.asObservable();
  public cartTimeout$ = this.cartTimeoutSubject.asObservable();

  // Tiempo de vida del carrito en milisegundos (10 minutos)
  private readonly CART_LIFETIME = 10 * 60 * 1000;

  constructor(private http: HttpClient, private router: Router) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCartFromLocalStorage();
      this.setupCartExpiration();
    }
  }

  private loadCartFromLocalStorage(): void {
    const cartData = localStorage.getItem('cart');
    const cartExpiration = localStorage.getItem('cartExpiration');
    const cartId = localStorage.getItem('cartId');
    
    if (cartData && cartExpiration && cartId) {
      const expirationTime = parseInt(cartExpiration, 10);
      const now = Date.now();
      
      if (now < expirationTime) {
        // El carrito aún no ha expirado
        this.cartItemsSubject.next(JSON.parse(cartData));
        this.cartId = cartId;
        this.startExpirationTimer(expirationTime - now);
      } else {
        // El carrito ya expiró, limpiarlo
        this.clearCart();
      }
    }
  }

  private setupCartExpiration(): void {
    if (this.cartId) {
      const expiration = localStorage.getItem('cartExpiration');
      if (expiration) {
        const expirationTime = parseInt(expiration, 10);
        const now = Date.now();
        const timeLeft = expirationTime - now;
        
        if (timeLeft > 0) {
          this.startExpirationTimer(timeLeft);
        } else {
          this.clearCart();
        }
      }
    }
  }

  private startExpirationTimer(duration: number): void {
    if (this.cartTimer) {
      clearInterval(this.cartTimer);
    }

    const startTime = Date.now();
    const endTime = startTime + duration;
    
    this.updateTimeoutValue(duration);
    
    this.cartTimer = setInterval(() => {
      const now = Date.now();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        this.handleCartExpiration();
        return;
      }
      
      this.updateTimeoutValue(timeLeft);
    }, 1000);
  }

  private updateTimeoutValue(timeLeft: number): void {
    // Convertir milisegundos a segundos
    const secondsLeft = Math.floor(timeLeft / 1000);
    this.cartTimeoutSubject.next(secondsLeft);
  }

  private handleCartExpiration(): void {
    clearInterval(this.cartTimer);
    this.cartTimeoutSubject.next(null);
    
    if (isPlatformBrowser(this.platformId)) {
      alert('Tu carrito ha expirado. Los productos han sido devueltos al inventario.');
    }
    
    this.clearCart();
    this.router.navigate(['/product']);
  }

  addToCart(product: any): Observable<any> {
    // Si no hay un carrito, crear uno nuevo
    if (!this.cartId) {
      return this.createCart().pipe(
        tap(response => {
          this.cartId = response.cartId;
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('cartId', response.cartId);
          }
          this.startCartTimeout();
        }),
        map(() => this.addItemToCart(product))
      );
    }
    
    return this.addItemToCart(product);
  }

  private addItemToCart(product: any): Observable<any> {
    const currentItems = this.cartItemsSubject.value;
    const existingItem = currentItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Verificar si hay suficiente stock
      if (existingItem.quantity + 1 > product.stock) {
        throw new Error('No hay suficiente stock disponible');
      }
      
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + 1
      };
      
      return this.updateCartItem(product.id, updatedItem);
    } else {
      if (product.stock < 1) {
        throw new Error('Producto sin stock disponible');
      }
      
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.productImageData || '',
        stock: product.stock
      };
      
      return this.http.post<any>(`/api/cart/${this.cartId}/items`, {
        productId: newItem.productId,
        quantity: newItem.quantity
      }).pipe(
        tap(() => {
          const updatedCart = [...currentItems, newItem];
          this.cartItemsSubject.next(updatedCart);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('cart', JSON.stringify(updatedCart));
          }
        })
      );
    }
  }

  private updateCartItem(productId: number, updatedItem: CartItem): Observable<any> {
    return this.http.put<any>(`/api/cart/${this.cartId}/items/${productId}`, {
      quantity: updatedItem.quantity
    }).pipe(
      tap(() => {
        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => 
          item.productId === productId ? updatedItem : item
        );
        this.cartItemsSubject.next(updatedItems);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('cart', JSON.stringify(updatedItems));
        }
      })
    );
  }

  removeFromCart(productId: number): Observable<any> {
    return this.http.delete<any>(`/api/cart/${this.cartId}/items/${productId}`).pipe(
      tap(() => {
        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.filter(item => item.productId !== productId);
        this.cartItemsSubject.next(updatedItems);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('cart', JSON.stringify(updatedItems));
        }
        
        // Si el carrito está vacío, eliminarlo
        if (updatedItems.length === 0) {
          this.deleteCart();
        }
      })
    );
  }

  updateQuantity(productId: number, quantity: number): Observable<any> {
    const currentItems = this.cartItemsSubject.value;
    const itemToUpdate = currentItems.find(item => item.productId === productId);
    
    if (!itemToUpdate) {
      throw new Error('Producto no encontrado en el carrito');
    }
    
    if (quantity > itemToUpdate.stock) {
      throw new Error('No hay suficiente stock disponible');
    }
    
    const updatedItem = {
      ...itemToUpdate,
      quantity
    };
    
    return this.updateCartItem(productId, updatedItem);
  }

  private createCart(): Observable<any> {
    return this.http.post<any>('/api/cart', {});
  }

  private deleteCart(): void {
    if (this.cartId) {
      this.http.delete<any>(`/api/cart/${this.cartId}`).subscribe({
        next: () => this.clearCart(),
        error: (err) => console.error('Error al eliminar el carrito:', err)
      });
    }
  }

  clearCart(): void {
    if (this.cartTimer) {
      clearInterval(this.cartTimer);
    }
    
    this.cartItemsSubject.next([]);
    this.cartTimeoutSubject.next(null);
    this.cartId = null;
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('cart');
      localStorage.removeItem('cartExpiration');
      localStorage.removeItem('cartId');
    }
  }

  private startCartTimeout(): void {
    const expirationTime = Date.now() + this.CART_LIFETIME;
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cartExpiration', expirationTime.toString());
    }
    
    this.startExpirationTimer(this.CART_LIFETIME);
  }

  refreshCartTimeout(): Observable<any> {
    if (!this.cartId) {
      return new Observable(observer => {
        observer.error('No hay un carrito activo');
        observer.complete();
      });
    }
    
    return this.http.put<any>(`/api/cart/${this.cartId}/refresh`, {}).pipe(
      tap(() => {
        // Reiniciar el temporizador
        this.startCartTimeout();
      })
    );
  }

  checkout(): Observable<any> {
    if (!this.cartId) {
      return new Observable(observer => {
        observer.error('No hay un carrito activo');
        observer.complete();
      });
    }
    
    return this.http.post<any>(`/api/cart/${this.cartId}/checkout`, {}).pipe(
      tap(() => {
        this.clearCart();
      })
    );
  }

  get cartTotal(): number {
    return this.cartItemsSubject.value.reduce(
      (total, item) => total + item.price * item.quantity, 
      0
    );
  }

  get itemCount(): number {
    return this.cartItemsSubject.value.reduce(
      (count, item) => count + item.quantity,
      0
    );
  }
}