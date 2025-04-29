import { Component } from '@angular/core';
import { ProductListComponent } from '../product-list/product-list.component';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  imports: [ProductListComponent, HttpClientModule]
})
export class ProductsComponent {
  // El componente solo actúa como contenedor
}