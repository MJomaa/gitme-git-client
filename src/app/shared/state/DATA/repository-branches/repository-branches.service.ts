import { Injectable } from '@angular/core';
import { RepositoryBranchesStore } from './repository-branches.store';
import { RepositoryBranchSummary } from './repository-branch.model';
import { RepositoryBranchesQuery } from './repository-branches.query';
import { GitService } from '../../../../services/features/git.service';
import { Account } from '../account-list';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Repository } from '../repositories';

@Injectable({ providedIn: 'root' })
export class RepositoryBranchesService {

    constructor(
        private store: RepositoryBranchesStore,
        private query: RepositoryBranchesQuery,
        private gitService: GitService
    ) {
    }

    async load(repository: Repository) {
        const repoSum = await this.gitService.getBranchInfo(repository.directory, repository.branches);
        this.set(repoSum);
    }

    set(listBranch: RepositoryBranchSummary[]) {
        listBranch.sort(
            (branchA, branchB) => {
                if (branchA.current) {
                    return -1;
                } else if (branchB.current) {
                    return 1;
                }
                return 0;
            }
        );
        listBranch.every(branch => {
            if (branch.current) {
                this.setActive(branch);
                return false;
            }
            return true;
        });
        this.store.set(listBranch);
    }

    select(): Observable<RepositoryBranchSummary[]> {
        return this.query.selectAll();
    }

    get(): RepositoryBranchSummary[] {
        return this.query.getAll();
    }

    selectActive() {
        this.setLoading();
        return this.query.selectActive().pipe(
            tap(() => {
                this.finishLoading();
            })
        );
    }

    getActive() {
        return this.query.getActive();
    }

    setActive(branch: RepositoryBranchSummary) {
        this.store.setActive(branch.id);
    }

    setActiveID(branchID: string) {
        this.store.setActive(branchID);
    }

    setLoading() {
        this.store.setLoading(true);
    }

    finishLoading() {
        this.store.setLoading(false);
    }
}
