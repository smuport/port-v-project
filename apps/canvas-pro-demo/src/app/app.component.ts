import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `
    <div class="nav">
      <a routerLink="/particle">粒子效果</a>
      <a routerLink="/gantt">甘特图</a>
      <a routerLink="/ship-side">船舶侧视图</a>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .nav {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 100;
      background: rgba(255, 255, 255, 0.8);
      padding: 10px;
      border-radius: 5px;
    }
    .nav a {
      margin-right: 10px;
      text-decoration: none;
      color: #333;
      font-weight: bold;
    }
    .nav a:hover {
      color: #4285F4;
    }
  `],
  standalone: true,
})
export class AppComponent {
  title = 'canvas-pro-demo';
}
