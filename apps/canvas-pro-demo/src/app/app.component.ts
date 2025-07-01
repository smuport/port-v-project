import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-root',
  template: `
    <div class="app-container">
      <nav class="nav-menu">
        <a routerLink="/particle" routerLinkActive="active">粒子系统</a>
        <a routerLink="/ship-side" routerLinkActive="active">船舶侧视图</a>
        <a routerLink="/gantt" routerLinkActive="active">甘特图</a>
        <a routerLink="/qcwp" routerLinkActive="active">岸桥分路计划</a>
        <a routerLink="/vessel-bay" routerLinkActive="active">船贝图</a>
        <a routerLink="/yard-bay" routerLinkActive="active">箱区贝图</a>
      </nav>
      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
      .app-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      
      .nav-menu {
        display: flex;
        background-color: #333;
        padding: 10px;
      }
      
      .nav-menu a {
        color: white;
        text-decoration: none;
        padding: 8px 16px;
        margin-right: 10px;
        border-radius: 4px;
      }
      
      .nav-menu a:hover {
        background-color: #555;
      }
      
      .nav-menu a.active {
        background-color: #4CAF50;
      }
      
      .content {
        flex: 1;
        overflow: auto;
      }
    `,
  ],
})
export class AppComponent { }
