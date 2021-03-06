import { Component, OnInit } from '@angular/core';
import { RepositoriesService, Repository } from '../../../shared/state/DATA/repositories';
import { GitLogsService, ListLogLine } from '../../../shared/state/DATA/logs';
import { RepositoryStatusService } from '../../../shared/state/DATA/repository-status';
import { catchError, distinctUntilChanged, filter, skipWhile, switchMap, takeWhile } from 'rxjs/operators';
import { fromPromise } from 'rxjs/internal-compatibility';
import { FileChangeStatus, LogFile } from '../../../shared/state/DATA/logs-files';
import { UtilityService } from '../../../shared/utilities/utility.service';
import { diffChangeStatus, GitDiffService } from '../../../shared/state/DATA/git-diff';
import { Subject } from 'rxjs';
import { RepositoriesMenuService } from '../../../shared/state/UI/repositories-menu';
import { deepEquals } from '../../../shared/utilities/utilityHelper';

@Component({
  selector: 'gitme-repo-history',
  templateUrl: './repo-history.component.html',
  styleUrls: ['./repo-history.component.scss']
})
export class RepoHistoryComponent implements OnInit {

  repository: Repository = null;
  viewLogs: ListLogLine = null;
  commitmentFiles: { file: LogFile, active: boolean }[] = [];
  activeFile: LogFile = null;

  requestViewLog: Subject<LogFile> = new Subject<LogFile>();

  constructor(
    private repositoryService: RepositoriesService,
    private statusService: RepositoryStatusService,
    private logsService: GitLogsService,
    public utilities: UtilityService,
    private menuService: RepositoriesMenuService,
    private gitDiff: GitDiffService
  ) {
    this.repository = this.repositoryService.getActive();
    this.logsService.initialLogs(this.repository)
    .subscribe(() => {
      this.activeViewTracking();
    });

    this.requestViewLog
    .pipe(
      distinctUntilChanged(),
      takeWhile(() => this.menuService.get().commit_view === 'history'),
      switchMap((fileLog) => {
        this.activeFile = fileLog;
        this.changeActive(fileLog.path);
        return fromPromise(this.statusService.diffOfFileFromCommit(
          this.repository, fileLog.path, this.getFileStatus(fileLog.status), this.viewLogs.hash
        ));
      })
    )
    .subscribe(diff => {
    });
  }

  ngOnInit() {
  }

  activeViewTracking() {
    this.logsService.observeActive()
    .pipe(
      distinctUntilChanged(),
      catchError(err => {
        console.log(err);
        return null;
      }),
      filter(log => !!log),
      switchMap((log: ListLogLine) => {
        this.viewLogs = log;
        this.activeFile = null;
        return fromPromise(this.statusService.filesFromCommit(this.repository, log.hash));
      }),
    )
    .subscribe(res => {
      this.commitmentFiles = res.files.map((file, index) => {
        return { file: file, active: index === 0 };
      });
      if (this.commitmentFiles[0]) {
        this.viewDiffFile(this.commitmentFiles[0].file);
      } else {
        this.gitDiff.reset();
      }
    });
  }

  openDirectory() {

  }

  viewDiffFile(file: LogFile) {
    this.requestViewLog.next(file);
  }

  private changeActive(activeFilePath: string) {
    this.commitmentFiles = this.commitmentFiles.map(sel => {
      return { file: sel.file, active: sel.file.path === activeFilePath };
    });
  }

  private getFileStatus(status: FileChangeStatus): diffChangeStatus {
    switch (status) {
      case FileChangeStatus.added:
        return 'new';
      case FileChangeStatus.deleted:
        return 'delete';
      case FileChangeStatus.modified:
        return 'change';
      default:
        return 'change';
    }
  }
}
