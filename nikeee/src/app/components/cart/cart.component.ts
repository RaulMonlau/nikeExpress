import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth-service.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cartItems: any[] = [];
  cartTotal = 0;
  cartTimeout: number | null = null;
  processingCheckout = false;
  checkoutSuccess = false;
  errorMessage: string | null = null;

  constructor(private cartService: CartService, private authService: AuthService) {}

  ngOnInit(): void {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });

    this.cartService.cartTimeout$.subscribe(timeout => {
      this.cartTimeout = timeout;
    });
  }

  calculateTotal(): void {
    this.cartTotal = this.cartService.cartTotal;
  }

  formatTimeRemaining(seconds: number | null): string {
    if (seconds === null) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  refreshCart(): void {
    this.cartService.refreshCartTimeout().subscribe({
      next: () => {
        // Éxito, el carrito se ha refrescado
      },
      error: (err) => {
        console.error('Error al refrescar el carrito:', err);
        this.errorMessage = 'No se pudo refrescar el tiempo del carrito.';
      }
    });
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId).subscribe({
      next: () => {
        // Éxito, el ítem se eliminó
      },
      error: (err) => {
        console.error('Error al eliminar el producto del carrito:', err);
        this.errorMessage = 'No se pudo eliminar el producto del carrito.';
      }
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity < 1) quantity = 1;
    
    try {
      this.cartService.updateQuantity(productId, quantity).subscribe({
        next: () => {
          // Éxito, la cantidad se actualizó
        },
        error: (err) => {
          console.error('Error al actualizar la cantidad:', err);
          this.errorMessage = 'No se pudo actualizar la cantidad.';
        }
      });
    } catch (err: any) {
      this.errorMessage = err.message;
    }
  }

  increaseQuantity(item: any): void {
    if (item.quantity < item.stock) {
      this.updateQuantity(item.productId, item.quantity + 1);
    }
  }

  decreaseQuantity(item: any): void {
    if (item.quantity > 1) {
      this.updateQuantity(item.productId, item.quantity - 1);
    }
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  checkout(): void {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'Debes iniciar sesión para completar la compra.';
      return;
    }
    
    this.processingCheckout = true;
    this.errorMessage = null;
    
    this.cartService.checkout().subscribe({
      next: () => {
        this.processingCheckout = false;
        this.checkoutSuccess = true;
        // Redirigir o mostrar mensaje de éxito
      },
      error: (err) => {
        console.error('Error al procesar el checkout:', err);
        this.processingCheckout = false;
        this.errorMessage = 'Error al procesar la compra. Intente de nuevo.';
      }
    });
  }

  continueToCheckout(): boolean {
    return this.cartItems.length > 0 && this.cartTimeout !== null && this.cartTimeout > 0;
  }
}