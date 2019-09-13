import { Injectable } from '@angular/core';
// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { BrowserWindow, ipcRenderer, remote, webFrame } from 'electron';
import { machineIdSync } from 'node-machine-id';
import * as childProcess from 'child_process';
import * as os from 'os';
import { LocalStorageService } from './localStorage.service';
import { electronNG, fsNode } from '../../shared/types/types.electron';
import { SecurityService } from './security.service';
import { FileSystemService } from './fileSystem.service';
import { DefineCommon } from '../../common/define.common';
import { RepositoriesService } from '../../shared/states/DATA/repositories';
import { AccountListService } from '../../shared/states/DATA/account-list';
import { AppRepositories } from '../../shared/model/App-Repositories';
import { AppAccounts } from '../../shared/model/App-Accounts';
import { AppConfig, DefaultConfig } from '../../shared/model/App-Config';

@Injectable({ providedIn: 'root' })
export class ElectronService {

    ipcRenderer: typeof ipcRenderer;
    webFrame: typeof webFrame;
    remote: typeof remote;
    childProcess: typeof childProcess;
    fs: typeof fsNode;
    os: typeof os;

    private window: BrowserWindow;
    private readonly machine_id: string;

    constructor(
        private localStorage: LocalStorageService,
        private securityService: SecurityService,
        private fileService: FileSystemService,
        private repositoriesList: RepositoriesService,
        private accountList: AccountListService
    ) {
        // Conditional imports
        if (ElectronService.isElectron()) {
            this.ipcRenderer = electronNG.ipcRenderer;
            this.webFrame = electronNG.webFrame;
            this.remote = electronNG.remote;
            this.window = electronNG.remote.getCurrentWindow();

            this.childProcess = window.require('child_process');
            this.fs = fsNode;
            this.machine_id = machineIdSync();
            this.setupUUID();
            this.initializeConfigFromLocalDatabase();
        }
    }

    static isElectron() {
        return window && window.process && window.process.type;
    }

    initializeConfigFromLocalDatabase() {
        /**
         * Loading the configuration file
         */
        const configDefaultName = this.machine_id;
        if (this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_CONFIG(configDefaultName))) {
            // load to memory repos and other settings
            this.setupApplicationConfiguration(
                this.fileService.getFileContext(
                    configDefaultName,
                    DefineCommon.DIR_CONFIG()
                )
            );
        } else {
            const data: AppConfig = DefaultConfig(configDefaultName);
            this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_CONFIG()).then(
                resolve => {
                    console.log(resolve);
                }, reject => {
                    console.log(reject);
                }
            );
        }
    }

    initializeRepositoriesFromLocalDatabase(repository_config: string[]) {
        this.repositoriesList.reset();
        if (!!repository_config && repository_config.length > 0) {
            /**
             * Loading repository config files
             */
            const repositoryConfigFileName = [];
            repository_config.forEach(fileName => {
                if (
                    // ensure no duplicated repo config file in the app config
                    repositoryConfigFileName.indexOf(fileName) === -1 &&
                    // ensure the config file is existed
                    this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_REPOSITORIES(fileName))
                ) {
                    // load to memory repos and other settings
                    this.setupApplicationRepositories(
                        this.fileService.getFileContext(
                            fileName,
                            DefineCommon.DIR_REPOSITORIES()
                        )
                    );
                    repositoryConfigFileName.push(fileName);
                }
            });
        } else {
            /**
             * create default config for application
             */
            const configDefaultName = this.machine_id;
            const data: AppRepositories = {
                repositories: [],
            };
            this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_REPOSITORIES()).then(
                resolve => {
                    console.log(resolve);
                }, reject => {
                    console.log(reject);
                }
            );
        }
    }

    initializeAccountsFromLocalDatabase(account_config: string[]) {
        this.accountList.reset();
        if (!!account_config && account_config.length > 0) {
            /**
             * Loading account config files
             */
            const accountConfigFileName = [];
            account_config.forEach(fileName => {
                if (
                    // ensure no duplicated account config file in the app config
                    accountConfigFileName.indexOf(fileName) === -1 &&
                    // ensure the config file is existed
                    this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_ACCOUNTS(fileName))
                ) {
                    // load to memory repos and other settings
                    this.setupApplicationAccounts(
                        this.fileService.getFileContext(
                            fileName,
                            DefineCommon.DIR_ACCOUNTS()
                        )
                    );
                    accountConfigFileName.push(fileName);
                }
            });
        } else {
            /**
             * create default config for application
             */
            const configDefaultName = this.machine_id;
            const data: AppAccounts = {
                accounts: [],
            };
            this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_ACCOUNTS()).then(
                resolve => {
                    console.log(resolve);
                }, reject => {
                    console.log(reject);
                }
            );
        }
    }

    closeApplication() {
        this.window.close();
    }

    minimizeApplication() {
        this.window.minimize();
    }

    private setupUUID() {
        if (!this.localStorage.isAvailable(DefineCommon.ELECTRON_APPS_UUID_KEYNAME)) {
            // warning first time access
            console.warn('First time accessing application!');
            console.warn('Automatically retrieve UUID machine');
            this.localStorage.set(DefineCommon.ELECTRON_APPS_UUID_KEYNAME, this.machine_id);
        } else {
            if (this.localStorage.get(DefineCommon.ELECTRON_APPS_UUID_KEYNAME) !== this.machine_id) {
                // warning sign in from unknown machine
                console.warn('Detecting unknown machine!');
                console.warn('Automatically retrieve and replace current UUID machine');
                this.localStorage.set(DefineCommon.ELECTRON_APPS_UUID_KEYNAME, this.machine_id);
            }
        }
    }

    private setupApplicationConfiguration(fileContext: Promise<{ status: boolean; message: string; value: any }>) {
        fileContext.then(contextStatus => {
            const dataOutput: AppConfig = contextStatus.value;
            // Load repository configs
            this.initializeRepositoriesFromLocalDatabase(dataOutput.repository_config);
            this.initializeAccountsFromLocalDatabase(dataOutput.account_config);
        });
    }

    private setupApplicationRepositories(fileContext: Promise<{ status: boolean; message: string; value: any }>) {
        fileContext.then((contextStatus) => {
            const dataOutput: AppRepositories = contextStatus.value;
            if (!!dataOutput.repositories && Array.isArray(dataOutput.repositories)) {
                this.repositoriesList.add(dataOutput.repositories);
            }
        });
    }

    private setupApplicationAccounts(fileContext: Promise<{ status: boolean; message: string; value: any }>) {
        fileContext.then((contextStatus) => {
            const dataOutput: AppAccounts = contextStatus.value;
            if (!!dataOutput.accounts && Array.isArray(dataOutput.accounts)) {
                this.accountList.add(dataOutput.accounts);
            }
        });
    }
}
