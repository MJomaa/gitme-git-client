import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RepositoriesRoutingModule } from './repositories-routing.module';
import { RepositoriesComponent } from './repositories.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CoreModule } from '../../shared/modules/core.module';
import { XTerminalModule } from '../../shared/layout/x-terminal/x-terminal.module';
import { RepoChangesComponent } from './dashboard/repo-changes/repo-changes.component';
import { RepoHistoryComponent } from './repo-history/repo-history.component';
import { RepoSettingsComponent } from './repo-settings/repo-settings.component';
import { NavigationBarModule } from '../../shared/layout/navigation-bar/navigation-bar.module';

const declareComps = [
  RepositoriesComponent,
  DashboardComponent,
];

@NgModule({
  declarations: [
    ...declareComps,
    RepoChangesComponent,
    RepoHistoryComponent,
    RepoSettingsComponent,
  ],
  exports: [],
  imports: [
    CommonModule,
    XTerminalModule,
    CoreModule,
    RepositoriesRoutingModule,
    NavigationBarModule
  ]
})
export class RepositoriesModule {
}
