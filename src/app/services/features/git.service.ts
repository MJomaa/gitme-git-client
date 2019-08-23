import { Injectable } from '@angular/core';
import * as git from 'simple-git/promise';
import { UtilityService } from '../../shared/utilities/utility.service';
import { Account } from '../../shared/states/DATA/account-list';
import { RepositoryBranchSummary } from '../../shared/states/DATA/repository-branches';
import { Repository } from '../../shared/states/DATA/repositories';
import { SecurityService } from '../system/security.service';

@Injectable()
export class GitService {

    constructor(
        private utilities: UtilityService,
        private securityService: SecurityService
    ) {
    }

    git(dir?) {
        return git(dir);
    }

    async cloneTo(cloneURL: string, directory: string, credentials?: Account) {
        let urlRemote = cloneURL;
        directory = directory + this.utilities.repositoryNameFromHTTPS(cloneURL);
        if (credentials) {
            urlRemote = this.utilities.addCredentialsToRemote(cloneURL, credentials);
        }
        return git().clone(urlRemote, directory);
    }

    async allBranches(directory: string, credentials?: Account) {
        directory = this.utilities.directorySafePath(directory);
        const branchAll = await this.git(directory).branch(['-a']);
        const branchRemote = await this.git(directory).branch(['-r']);
        const branchMerged: RepositoryBranchSummary[] = [];

        Object.keys(branchRemote.branches).forEach(branchName => {
            const viewBranch: RepositoryBranchSummary = {
                id: this.securityService.randomID,
                ...branchRemote.branches[branchName]
            };
            const arrSplitName = viewBranch.name.split('origin/');
            if (arrSplitName.length > 1 && arrSplitName[1] === branchAll.current) {
                Object.assign(viewBranch, { ...viewBranch }, { current: true });
            }
            branchMerged.push(viewBranch);
        });
        return branchMerged;
    }

    async fetchInfo(repository: Repository, credentials?: Account, customRemote: string = null) {
        // retrieve the directory for git to execute
        const { directory: repoDirectory, remote } = repository;
        const directory = this.utilities.directorySafePath(repoDirectory);

        // checking remotes
        let urlRemotes: string = null;
        const fetchURlLocal = !!remote ? remote.fetch : null;
        if (!!remote && !!fetchURlLocal) {
            if (credentials) {
                urlRemotes = this.utilities.addCredentialsToRemote(fetchURlLocal, credentials);
            } else {
                urlRemotes = fetchURlLocal;
            }
        } else {
            // retrieve from git
            const listRemotes = await this.git(directory).getRemotes(true);

            let fallbackURLRemotes = '';
            listRemotes.forEach(remoteInfo => {
                if (!!!customRemote && remoteInfo.name === 'origin') {
                    urlRemotes = this.getURLRemoteFromListGitRemotes(remoteInfo, credentials);
                    fallbackURLRemotes = urlRemotes;
                } else if (remoteInfo.name === customRemote) {
                    urlRemotes = this.getURLRemoteFromListGitRemotes(remoteInfo, credentials);
                }
            });

            if (!urlRemotes && !fallbackURLRemotes) {
                return false;
            }

            if (!urlRemotes) {
                urlRemotes = fallbackURLRemotes;
            }
        }
        // const urlRemote = this.utilities.addCredentialsToRemote(cloneURL, credentials);
        const data = await this.git(directory).fetch(urlRemotes);
        return {
            fetchData: data,
            repository
        };
    }

    async isGitProject(directory: string) {
        directory = this.utilities.directorySafePath(directory);
        return await git(directory).checkIsRepo();
    }

    async createRepositoryData(
        directory: string,
        rawCredentials: { username: string, password: string },
        remote: string,
        localName?: string
    ) {
        directory = this.utilities.directorySafePath(directory);
        const isRepo = await this.isGitProject(directory);
        if (!isRepo) {
            return null;
        }

        // const newRepo: Repository = {
        //     id: this.securityService.randomID,
        //
        // };
    }

    async pull() {

    }

    private getURLRemoteFromListGitRemotes(remoteInfo: {
        refs: {
            fetch: string;
            push: string;
        },
        [key: string]: any
    }, credentials?: Account) {
        if (credentials) {
            return this.utilities.addCredentialsToRemote(remoteInfo.refs.fetch, credentials);
        } else {
            return remoteInfo.refs.fetch;
        }
    }
}
