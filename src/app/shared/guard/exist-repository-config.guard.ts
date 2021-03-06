import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { DataService } from '../../services/features/core/data.service';
import { fromPromise } from 'rxjs/internal-compatibility';
import { SecurityService } from '../../services/system/security.service';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ExistRepositoryConfigGuard implements CanActivateChild {

  constructor(
    private dataService: DataService,
    private securityService: SecurityService,
    private router: Router
  ) {

  }

  canActivateChild(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return fromPromise(
      this.dataService.getConfigAppData(this.securityService.appUUID)
    ).pipe(
      switchMap(appRepo => {
        if (appRepo && appRepo.repository_config.length > 0) {
          return of(true);
        }

        this.router.navigate(['/application']);
        return of(false);
      })
    );
  }

}
