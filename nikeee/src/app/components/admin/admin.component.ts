import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule]
})
export class AdminComponent implements OnInit {
  adminForm!: FormGroup;
  previewImage: string | null = null;
  isEditing: boolean = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  constructor(private fb: FormBuilder, private productService: ProductService) { }

  ngOnInit(): void {
    this.adminForm = this.fb.group({
      reference: ['', [Validators.required]],
      name: ['', [Validators.required, this.noDuplicateNameValidator.bind(this)]],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.min(0)]],
      description: [''],
      productType: [''],
      offer: [false],
      productImageData: ['']
    });
  }

  // Validador para evitar nombres duplicados
  noDuplicateNameValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value || !this.adminForm) return null;
    const inputNameLower = control.value.toLowerCase();
    // Si se está editando, el campo reference está deshabilitado y se toma su valor mediante getRawValue
    const currentRef = this.adminForm.getRawValue().reference;
    const duplicate = this.productService.products.some(p =>
      p.name.toLowerCase() === inputNameLower && p.reference !== currentRef
    );
    return duplicate ? { duplicateName: true } : null;
  }

  // Al perder el foco en reference, se busca el producto
  onReferenceBlur(): void {
    const ref = this.adminForm.get('reference')?.value;
    const product = this.productService.products.find(p => p.reference === ref);
    if (product) {
      this.isEditing = true;
      // Se deshabilita reference para no permitir su modificación
      this.adminForm.get('reference')?.disable();
      this.adminForm.patchValue({
        name: product.name,
        price: product.price,
        stock: product.stock || 0,
        description: product.description,
        productType: product.productType,
        offer: product.offer,
        productImageData: product.productImageData || ''
      });
      this.previewImage = product.productImageData || null;
    } else {
      // Si no se encuentra, nos aseguramos de que el campo reference esté habilitado
      this.isEditing = false;
      this.adminForm.get('reference')?.enable();
    }
  }

  onProductImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
        this.adminForm.patchValue({ productImageData: reader.result });
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.submitError = null;
    this.submitSuccess = null;
    
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      this.submitError = "Por favor, corrija los errores en el formulario";
      return;
    }

    const productData = this.adminForm.getRawValue(); // getRawValue incluye valores deshabilitados
    
    if (this.isEditing) {
      this.productService.updateProduct(productData).subscribe({
        next: () => {
          this.submitSuccess = "¡Producto actualizado con éxito!";
          this.resetForm();
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
          this.submitError = error.error?.error || "Error al actualizar el producto";
        }
      });
    } else {
      this.productService.addProduct(productData).subscribe({
        next: () => {
          this.submitSuccess = "¡Producto agregado con éxito!";
          this.resetForm();
        },
        error: (error) => {
          console.error('Error al agregar producto:', error);
          this.submitError = error.error?.error || "Error al agregar el producto";
        }
      });
    }
  }

  resetForm(): void {
    this.adminForm.reset({
      reference: '',
      name: '',
      price: 0,
      stock: 0,
      description: '',
      productType: '',
      offer: false,
      productImageData: ''
    });
    this.adminForm.get('reference')?.enable();
    this.isEditing = false;
    this.previewImage = null;
  }

  deleteProduct(): void {
    if (!this.isEditing) return;

    const reference = this.adminForm.getRawValue().reference;
    if (!reference) return;

    if (confirm('¿Está seguro de eliminar este producto?')) {
      this.productService.deleteProduct(reference).subscribe({
        next: () => {
          this.submitSuccess = "Producto eliminado con éxito";
          this.resetForm();
        },
        error: (error) => {
          console.error('Error al eliminar producto:', error);
          this.submitError = error.error?.error || "Error al eliminar el producto";
        }
      });
    }
  }
}