import { Component, Input, OnInit } from '@angular/core';
import { RepositoryBranchesService, RepositoryBranchSummary } from '../../../state/DATA/branches';
import { RepositoryStatusService } from '../../../state/DATA/repository-status';
import { RepositoriesService, Repository } from '../../../state/DATA/repositories';
import { StatusSummary } from '../../../model/statusSummary.model';
import { MatBottomSheet, MatDialog } from '@angular/material';
import { BranchOptionsComponent } from '../_dialogs/branch-options/branch-options.component';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
import { LoadingIndicatorService } from '../../../state/UI/Loading-Indicator';
import { fromPromise } from 'rxjs/internal-compatibility';
import { BranchStashComponent } from '../_dialogs/branch-stash/branch-stash.component';
import { YesNoDialogModel } from '../../../model/yesNoDialog.model';
import { RepositoriesMenuService } from '../../../state/UI/repositories-menu';
import { GitDiffService } from '../../../state/DATA/git-diff';
import { GitLogsService } from '../../../state/DATA/logs';

@Component({
  selector: 'gitme-branch-item',
  templateUrl: './branch-item.component.html',
  styleUrls: ['./branch-item.component.scss']
})
export class BranchItemComponent implements OnInit {

  @Input() branchSummary: RepositoryBranchSummary;
  currentBranchSummary: any = undefined;
  private repository: Repository = null;
  private status: StatusSummary = null;

  constructor(
    private branchesService: RepositoryBranchesService,
    private statusService: RepositoryStatusService,
    private repositoriesService: RepositoriesService,
    private diffService: GitDiffService,
    private logsService: GitLogsService,
    private menuService: RepositoriesMenuService,
    private matBottomSheet: MatBottomSheet,
    private loading: LoadingIndicatorService,
    private matDialog: MatDialog
  ) {
    this.repositoriesService.selectActive()
    .subscribe(repo => {
      this.repository = { ...repo } as Repository;
    });

    this.statusService.select()
    .subscribe(status => {
      this.status = { ...status } as StatusSummary;
    });
  }

  ngOnInit() {
    this.currentBranchSummary = this.branchSummary;

  }

  checkoutBranches() {
    if (!this.branchSummary.current) {
      if (this.repository && this.branchSummary && this.status.files.length === 0) {
        this.loading.setLoading(`Checkout branch ${ this.branchSummary.name }`);
        fromPromise(this.branchesService.checkoutBranch(
          this.repository,
          this.branchSummary
        ))
        .pipe(
          tap(() => {
            this.diffService.reset();
            this.logsService.reset();
            this.menuService.reset();
          }),
          switchMap(() => fromPromise(this.branchesService.updateAll(this.repository))),
          switchMap(branches => fromPromise(this.repositoriesService.updateToDataBase(this.repository, branches))),
          switchMap(() => this.statusService.status(this.repository)),
        )
        .subscribe(
          () => {
            // Branch checkout status
            this.loading.setFinish();
          }
        );
      } else if (this.repository && this.status.files.length > 0) {
        const data: YesNoDialogModel = {
          title: 'Failed to checkout',
          body: 'There are changes that need to be committed before checkout to a new branch',
          data: null,
          decision: {
            noText: 'Cancel',
            yesText: 'Apply'
          }
        };
        this.matDialog.open(BranchStashComponent, {
          width: '280px',
          height: 'auto',
          data: data,
          panelClass: 'bg-primary-black-mat-dialog',
        });
      }
    }

  }

  onRightClick() {
    const dataPassing = {
      branch: this.branchSummary,
      repository: this.repository
    };
    if (this.branchSummary.current) {
      Object.assign(dataPassing, { status: this.status });
    }
    this.matBottomSheet.open(BranchOptionsComponent, {
      panelClass: ['bg-primary-black', 'p-2-option'],
      data: dataPassing
    }).afterDismissed().pipe(
      takeWhile(data => !!data),
    ).subscribe(
      actionPerformed => {
        console.log(actionPerformed);
      }
    );
  }


}
