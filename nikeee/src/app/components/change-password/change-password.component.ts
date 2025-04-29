import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  passwordForm: FormGroup;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  errorMessage: string = '';
  
  constructor(private fb: FormBuilder, private userService: UserService) {
    this.passwordForm = this.fb.group({
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }
  
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('passwordNueva');
    const confirm = control.get('passwordConfirm');
    
    if (!password || !confirm) return null;
    
    return password.value === confirm.value ? null : { 'mismatch': true };
  }
  
  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    
    const passwordData = {
      passwordActual: this.passwordForm.value.passwordActual,
      passwordNueva: this.passwordForm.value.passwordNueva
    };
    
    this.userService.changePassword(passwordData).subscribe(
      () => {
        this.showSuccessMessage = true;
        this.showErrorMessage = false;
        this.passwordForm.reset();
        setTimeout(() => {
          this.showSuccessMessage = false;
        }, 3000);
      },
      error => {
        this.showErrorMessage = true;
        this.errorMessage = error.error?.error || 'Error al cambiar contraseña';
        setTimeout(() => {
          this.showErrorMessage = false;
        }, 3000);
      }
    );
  }
}