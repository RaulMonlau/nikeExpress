import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormatDatePipe],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css']
})
export class OrderDetailComponent implements OnInit {
  @Input() orderId!: number;
  orderDetails: any = null;
  loading: boolean = true;
  error: string | null = null;
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.loadOrderDetails();
  }
  
  loadOrderDetails(): void {
    this.loading = true;
    this.userService.getOrderDetails(this.orderId).subscribe(
      data => {
        this.orderDetails = data;
        this.loading = false;
      },
      error => {
        this.error = 'Error al cargar los detalles del pedido';
        this.loading = false;
        console.error('Error al cargar detalles del pedido:', error);
      }
    );
  }
}