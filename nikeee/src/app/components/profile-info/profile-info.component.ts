import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.css']
})
export class ProfileInfoComponent implements OnInit {
  @Input() userData: any;
  profileForm!: FormGroup;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  errorMessage: string = '';
  
  constructor(private fb: FormBuilder, private userService: UserService) {}
  
  ngOnInit(): void {
    this.initForm();
  }
  
  ngOnChanges(): void {
    if (this.userData && this.profileForm) {
      this.profileForm.patchValue({
        nombre: this.userData.nombre,
        apellidos: this.userData.apellidos,
        email: this.userData.email
      });
    }
  }
  
  private initForm(): void {
    this.profileForm = this.fb.group({
      nombre: [this.userData?.nombre || '', [Validators.required, Validators.minLength(2)]],
      apellidos: [this.userData?.apellidos || '', [Validators.required, Validators.minLength(2)]],
      email: [this.userData?.email || '', [Validators.required, Validators.email]]
    });
  }
  
  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    
    this.userService.updateProfile(this.profileForm.value).subscribe(
      () => {
        this.showSuccessMessage = true;
        this.showErrorMessage = false;
        setTimeout(() => {
          this.showSuccessMessage = false;
        }, 3000);
      },
      error => {
        this.showErrorMessage = true;
        this.errorMessage = error.error?.error || 'Error al actualizar perfil';
        setTimeout(() => {
          this.showErrorMessage = false;
        }, 3000);
      }
    );
  }
}