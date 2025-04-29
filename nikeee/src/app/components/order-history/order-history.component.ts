import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { OrderDetailComponent } from '../order-detail/order-detail.component';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, OrderDetailComponent, FormatDatePipe],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css']
})
export class OrderHistoryComponent implements OnInit {
  orders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  selectedOrderId: number | null = null;
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.userService.getOrderHistory().subscribe(
      data => {
        this.orders = data;
        this.loading = false;
      },
      error => {
        this.error = 'Error al cargar el historial de compras';
        this.loading = false;
        console.error('Error al cargar compras:', error);
      }
    );
  }
  
  viewOrderDetails(orderId: number): void {
    this.selectedOrderId = this.selectedOrderId === orderId ? null : orderId;
  }
}