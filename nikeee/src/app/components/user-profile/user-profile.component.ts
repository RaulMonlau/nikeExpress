import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileInfoComponent } from '../profile-info/profile-info.component';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { OrderHistoryComponent } from '../order-history/order-history.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileInfoComponent,
    ChangePasswordComponent,
    OrderHistoryComponent
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  activeTab: string = 'profile';
  user: any = null;
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.userService.getUserProfile().subscribe(
      data => {
        this.user = data;
      },
      error => {
        console.error('Error al cargar perfil:', error);
      }
    );
    
    this.userService.user$.subscribe(
      user => {
        if (user) {
          this.user = user;
        }
      }
    );
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}