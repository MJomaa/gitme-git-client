import { Injectable, OnDestroy } from '@angular/core';
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
import { AppRepositories, InitializeRepositoryConfig } from '../../shared/model/App-Repositories';
import { AppAccounts } from '../../shared/model/App-Accounts';
import { AppConfig, InitializeAppConfig } from '../../shared/model/App-Config';
import { ApplicationStateService } from '../../shared/states/UI/Application-State';
import { DataService } from '../features/data.service';

@Injectable({ providedIn: 'root' })
export class ElectronService implements OnDestroy {
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
        private dataService: DataService,
        private repositoriesList: RepositoriesService,
        private accountList: AccountListService,
        private applicationStateService: ApplicationStateService
    ) {
        // Conditional imports
        if (ElectronService.isElectron()) {
            this.ipcRenderer = electronNG.ipcRenderer;
            this.webFrame = electronNG.webFrame;
            this.remote = electronNG.remote;
            this.window = electronNG.remote.getCurrentWindow();
            // this.window.on('blur', () => {
            //     this.applicationStateService.setBlur();
            // });
            // this.window.on('focus', () => {
            //     this.applicationStateService.setFocus();
            // });

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

    ngOnDestroy(): void {
    }

    initializeConfigFromLocalDatabase() {
        /**
         * Loading the configuration file
         */
        const configDefaultName = this.machine_id;
        if (this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_CONFIG(configDefaultName))) {
            // load to memory repos and other settings
            this.setupApplicationConfiguration(
                this.dataService.getAppDataFromFile(configDefaultName)
            );
        } else {
            const data: AppConfig = InitializeAppConfig(configDefaultName);
            this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_CONFIG()).then(
                () => {
                    this.setupApplicationConfiguration(
                        this.dataService.getAppDataFromFile(configDefaultName)
                    );
                }, reject => {
                    console.log(reject);
                }
            );
        }
    }

    async initializeRepositoriesFromLocalDatabase(repository_config: string[]) {
        this.repositoriesList.reset();
        if (!!repository_config && repository_config.length > 0) {
            /**
             * Loading repository config files
             */
            const repositoryConfigFileName = [];
            for (const fileName of repository_config) {
                if (
                    // ensure no duplicated repo config file in the app config
                    repositoryConfigFileName.indexOf(fileName) === -1
                ) {
                    if (// ensure the config file is existed
                        this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_REPOSITORIES(fileName))) {
                        // load to memory repos and other settings
                        await this.setupApplicationRepositories(
                            this.dataService.getRepositoriesFromFile(fileName)
                        );
                        repositoryConfigFileName.push(fileName);
                    } else {
                        const data: AppRepositories = InitializeRepositoryConfig();
                        await this.fileService.createFile(fileName, data, DefineCommon.DIR_REPOSITORIES()).then(
                            resolve => {
                                console.log(resolve);
                            }, reject => {
                                console.log(reject);
                            }
                        );
                    }

                }
            }
        } else {
            /**
             * create default config for application
             */
            const configDefaultName = this.machine_id;
            /**
             * Update config if not linked to default repository app config
             */
            if (this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_REPOSITORIES(configDefaultName))) {
                const currentConfig = await this.dataService.getAppDataFromFile(configDefaultName);
                currentConfig.repository_config.push(configDefaultName);
                await this.dataService.updateAppConfigFile(currentConfig, configDefaultName);
            } else {
                const data: AppRepositories = {
                    repositories: [],
                };
                await this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_REPOSITORIES()).then(
                    resolve => {
                        console.log(resolve);
                    }, reject => {
                        console.log(reject);
                    }
                );
            }
        }
    }

    async initializeAccountsFromLocalDatabase(account_config: string[]) {
        this.accountList.reset();
        if (!!account_config && account_config.length > 0) {
            /**
             * Loading account config files
             */
            const accountConfigFileName = [];
            for (const fileName of account_config) {
                if (
                    // ensure no duplicated account config file in the app config
                    accountConfigFileName.indexOf(fileName) === -1
                ) {
                    if (
                        // ensure the config file is existed
                        this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_ACCOUNTS(fileName))
                    ) {
                        // load to memory repos and other settings
                        await this.setupApplicationAccounts(
                            this.dataService.getAccountsFromFile(fileName)
                        );
                        accountConfigFileName.push(fileName);
                    } else {
                        const data: AppAccounts = {
                            accounts: [],
                        };
                        await this.fileService.createFile(fileName, data, DefineCommon.DIR_ACCOUNTS()).then(
                            resolve => {
                                console.log(resolve);
                            }, reject => {
                                console.log(reject);
                            }
                        );
                    }

                }
            }
        } else {
            /**
             * create default config for application
             */
            const configDefaultName = this.machine_id;

            /**
             * Update config if not linked to default account app config
             */
            if (this.fileService.isFileExist(DefineCommon.ROOT + DefineCommon.DIR_ACCOUNTS(configDefaultName))) {
                const currentConfig = await this.dataService.getAppDataFromFile(configDefaultName);
                currentConfig.account_config.push(configDefaultName);

                await this.dataService.updateAppConfigFile(currentConfig, configDefaultName);
            } else {
                const data: AppAccounts = {
                    accounts: [],
                };
                await this.fileService.createFile(configDefaultName, data, DefineCommon.DIR_ACCOUNTS()).then(
                    resolve => {
                        console.log(resolve);
                    }, reject => {
                        console.log(reject);
                    }
                );
            }
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

    private setupApplicationConfiguration(fileContext: Promise<AppConfig>) {
        fileContext.then(async contextStatus => {
            // Load repository configs
            await this.initializeRepositoriesFromLocalDatabase(contextStatus.repository_config);
            await this.initializeAccountsFromLocalDatabase(contextStatus.account_config);
        });
    }

    private async setupApplicationRepositories(fileContext: Promise<AppRepositories>) {
        return await fileContext.then((contextStatus) => {
            if (!!contextStatus.repositories && Array.isArray(contextStatus.repositories)) {
                this.repositoriesList.add(contextStatus.repositories);
            }
        });
    }

    private async setupApplicationAccounts(fileContext: Promise<AppAccounts>) {
        return await fileContext.then((contextStatus) => {
            if (!!contextStatus.accounts && Array.isArray(contextStatus.accounts)) {
                this.accountList.add(contextStatus.accounts);
            }
        });
    }
}