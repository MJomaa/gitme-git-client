import { Injectable } from '@angular/core';
import { createInitialState, FileStatusSummaryView, RepositoryStatusStore } from './repository-status.store';
import { StatusSummary } from '../../../model/statusSummary.model';
import { RepositoryStatusQuery } from './repository-status.query';
import { GitService } from '../../../../services/features/core/git.service';
import { Repository } from '../repositories';
import { parseShowFileHistory } from '../../../utilities/merge-tree-parser';
import { deepMutableObject } from '../../../utilities/utilityHelper';
import { diffChangeStatus, GitDiffService } from '../git-diff';

@Injectable({ providedIn: 'root' })
export class RepositoryStatusService {

  constructor(
    private store: RepositoryStatusStore,
    private query: RepositoryStatusQuery,
    private git: GitService,
    private diffService: GitDiffService
  ) {
  }

  async status(repository: Repository) {
    const status: StatusSummary = await this.git.status(repository);
    this.set(status);
    return status;
  }

  async filesFromCommit(repository: Repository, commitSHA: string) {
    let rawStatus = await this.git.showCommit(repository, commitSHA);
    let isMergeRequest = false;
    if (rawStatus.match(/Merge:\s.+\s.+\nAuthor/g)) {
      // in merge
      isMergeRequest = true;
      rawStatus = await this.git.showCommit(repository, '--first-parent', commitSHA);
    }
    return parseShowFileHistory(rawStatus, isMergeRequest);
  }

  async diffOfFileFromCommit(
    repository: Repository, path: string,
    modificationType: diffChangeStatus, commitSHA: string
  ) {
    const rawFileDiff = await this.git.diffsFromCommit(repository, path, commitSHA);
    return await this.diffService.setDiff(rawFileDiff, path, modificationType);
  }

  set(status: StatusSummary) {
    const currentArr = this.query.getValue().files;
    const mutable: StatusSummary = deepMutableObject(status);
    const convertedFileStatus: FileStatusSummaryView[] = mutable.files.map<FileStatusSummaryView>(
      file => {
        const isCached = this.retrieveExistedCacheFile(currentArr, file.path);
        return {
          ...file,
          checked: isCached ? this.retrieveCheckStatusFromCacheFile(isCached) : true,
          active: isCached ? isCached.active : false
        };
      }
    );
    this.store.update(
      Object.assign(mutable, { files: convertedFileStatus })
    );
  }

  reset() {
    this.store.update(createInitialState());
  }

  select() {
    return this.query.select();
  }

  get() {
    return this.query.getValue();
  }

  toggleCheckbox(indexState: number) {
    const updateState = this.retrieveToggledCheckedArray(indexState);
    this.store.update({
      files: updateState.newArrayState
    });
    return updateState;
  }

  setActive(indexState: number) {
    this.store.update({
      files: this.retrieveToggledActivatedArray(indexState)
    });
  }

  resetActiveState() {
    const mutableArrayState = [...this.query.getValue().files];
    const newMutable = mutableArrayState.map(
      file => <FileStatusSummaryView>Object.assign(
        { ...file },
        { active: false }
      )
    );
    this.store.update({
      files: newMutable
    });
  }

  checkAllCheckboxState() {
    const mutableState = deepMutableObject(this.query.getValue());
    const files = mutableState.files;
    const newMutable = files.map(
      file => <FileStatusSummaryView>Object.assign(
        file,
        { checked: true }
      )
    );
    this.store.update({
      files: newMutable
    });
  }

  uncheckAllCheckboxState() {
    const mutableState = deepMutableObject(this.query.getValue());
    const files = mutableState.files;
    const newMutable = files.map(
      file => <FileStatusSummaryView>Object.assign(
        file,
        { checked: false }
      )
    );
    this.store.update({
      files: newMutable
    });
  }

  private retrieveExistedCacheFile(arrayToFind: FileStatusSummaryView[], pathToFind: string) {
    return arrayToFind.find(fileExisted => fileExisted.path === pathToFind);
  }

  private retrieveCheckStatusFromCacheFile(file: FileStatusSummaryView) {
    if (file && file.checked === false) {
      return file.checked;
    }

    return true;
  }

  private retrieveToggledCheckedArray(index: number) {
    const immutableState = this.query.getValue().files;
    const mutableState = [...immutableState];
    const newState = Object.assign({
      ...mutableState[index],
      checked: !mutableState[index].checked
    });
    mutableState[index] = newState;
    return {
      newArrayState: mutableState,
      oldArrayState: immutableState,
      oldItemState: mutableState[index],
      newItemState: newState
    };
  }

  private retrieveToggledActivatedArray(index: number) {
    const mutableState = [...this.query.getValue().files];
    mutableState.forEach((file, i, allFiles) => {
      allFiles[i] = Object.assign({
        ...file,
        active: i === index
      });
    });
    return mutableState;
  }
}
