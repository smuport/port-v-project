import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent {
  title = 'canvas-pro-demo';
}
