import { Injectable } from '@angular/core';
import { electronNG, fsNode, pathNode, utilNode } from '../../shared/types/types.electron';
import { UtilityService } from '../../shared/utilities/utility.service';
import { DefineCommon } from '../../common/define.common';

@Injectable({ providedIn: 'root' })
export class FileSystemService {

    private readonly fsNODE: typeof fsNode;
    private readonly pathNODE: typeof pathNode;
    private readonly utilNODE: typeof utilNode;
    private readonly appELECTRON: typeof electronNG.remote.app;

    private readonly ROOT;

    constructor(
        private utilitiesService: UtilityService
    ) {
        this.fsNODE = fsNode;
        this.appELECTRON = electronNG.remote.app;
        this.utilNODE = utilNode;
        this.ROOT = DefineCommon.ROOT;
    }

    get fs() {
        return this.fsNODE;
    }

    get path() {
        return this.pathNODE;
    }

    get util() {
        return this.utilNODE;
    }

    get app() {
        return this.appELECTRON;
    }

    /**
     * Check if directory exist.
     * If it's not a directory, or not exist, return false
     * @param directoryPath raw absolute path
     */
    isDirectoryExist(directoryPath: string) {
        const safePath = this.utilitiesService.directorySafePath(directoryPath);
        const existingDirectory = this.fs.existsSync(safePath);
        if (existingDirectory) {
            return this.fs.lstatSync(safePath).isDirectory();
        }
        return false;
    }

    /**
     * Check if file exist.
     * If it's not a file, or not exist, return false
     * Input file must include extension
     * @param directoryPath raw absolute path
     */
    isFileExist(directoryPath: string) {
        let safePath = this.utilitiesService.directorySafePath(directoryPath);
        safePath = safePath.slice(0, safePath.length - 1);
        const existingFile = this.fs.existsSync(safePath);
        if (existingFile) {
            return this.fs.lstatSync(safePath).isFile();
        }
        return false;
    }

    /**
     * Create a custom text-plain file
     * This function will return a promise with error message if the file is exist or data passing was incorrect format.
     * Only accept string/pure-object data.
     * If insist, please use updateFileContext which will override the content of existing file.
     * Currently only storing on appData user folder (with application name)
     * Which can be:
     * * %APPDATA% on windows
     * * $XDG_CONFIG_HOME or ~/.config on Linux
     * * ~/Library/Application Support on macOS
     * @param fileName
     * @param data will be stringify when write to file if extension is .txt
     * @param directoryPath extra path to append. Must include slash to front and end
     * @param extension currently only accepting .txt or .json file. Much prefer `.json`.
     * @param useRoot pre-appending %appdata% into the path
     */
    createFile(
        fileName: string,
        data: object | string,
        directoryPath: string = '/',
        extension: '.json' | '.txt' = '.json',
        useRoot = true
    ) {
        const rootStoreDir = useRoot ? this.ROOT : '';
        const fileFullName = fileName + extension;
        const finalDir = rootStoreDir + directoryPath + fileFullName;
        if (!this.isDirectoryExist(rootStoreDir + directoryPath)) {
            // @ts-ignore
            this.fs.mkdirSync(rootStoreDir + directoryPath, { recursive: true });
        }
        if (this.isFileExist(finalDir)) {
            return new Promise((resolve, reject) => reject(new Object({
                status: false,
                message: 'File already existed' // for debugging purpose
            })));
        }
        const writePromises = this.util.promisify(this.fs.writeFile);
        const writeDataStatus = this.parsingData(data, extension);
        if (!writeDataStatus.valid) {
            return new Promise((resolve, reject) => reject(new Object({
                status: false,
                message: writeDataStatus.data // for debugging purpose
            })));
        }
        return writePromises(finalDir, writeDataStatus.data);
    }

    /**
     * Retrieve the data in the file
     * return promise that has status false if the directory/file not exist or cannot read file
     * @param fileName the file name without extension
     * @param directoryPath directory with front and back included slash
     * @param extension support default .json, .txt is also supported.
     */
    getFileContext<dataType>(
        fileName: string,
        directoryPath: string,
        extension: '.txt' | '.json' = '.json'
    ): Promise<{ status: boolean, message: string, value: dataType | any }> {
        const rootStoreDir = this.ROOT;
        const fileFullName = fileName + extension;
        const finalDir = rootStoreDir + directoryPath + fileFullName;

        if (!this.isFileExist(finalDir)) {
            return this.promiseReturn(null, 'File not exist', false);
        }

        const readPromises = this.util.promisify(this.fs.readFile);
        return readPromises(finalDir).then((resolveStringData: any) => {
            let outPut: dataType = null;
            if (extension === '.json') {
                outPut = JSON.parse(resolveStringData);
            } else {
                outPut = resolveStringData;
            }
            return {
                status: true,
                message: 'Read success - Dir: ' + finalDir,
                value: outPut
            };
        }, err => {
            return {
                status: false,
                message: 'Read failed - Dir: ' + finalDir,
                value: err
            };
        });
    }

    /**
     * update a custom text-plain file
     * This function will return a promise with error message if the file is not exist or data passing was incorrect format.
     * Only accept string/pure-object data.
     * If insist, please use *saveFileData* method to override or create if file not exist.
     * Currently only storing on appData user folder (with application name)
     * Which can be:
     * * %APPDATA% on windows
     * * $XDG_CONFIG_HOME or ~/.config on Linux
     * * ~/Library/Application Support on macOS
     * @param fileName
     * @param data will be stringify when write to file if extension is .txt
     * @param directoryPath extra path to append. Must include slash to front and end
     * @param extension currently only accepting .txt or .json file. Much prefer `.json`.
     */
    updateFileContext(
        fileName: string,
        data: object | string,
        directoryPath: string = '/',
        extension: '.json' | '.txt' = '.json'
    ) {
        const rootStoreDir = this.ROOT;
        const fileFullName = fileName + extension;
        const finalDir = rootStoreDir + directoryPath + fileFullName;
        if (!this.isDirectoryExist(rootStoreDir + directoryPath) || !this.isFileExist(finalDir)) {
            return this.promiseReturn(null, 'File or Directory is not existed', false);
        }
        const writePromises = this.util.promisify(this.fs.writeFile);
        const writeDataStatus = this.parsingData(data, extension);
        if (!writeDataStatus.valid) {
            return this.promiseReturn(null, writeDataStatus.data, false);
        }
        return writePromises(finalDir, writeDataStatus.data);
    }

    saveFileData(
        fileName: string,
        data: object | string,
        directoryPath: string = '/',
        extension: '.json' | '.txt' = '.json',
        isForcing = true,
        useRoot = true
    ) {
        const rootStoreDir = useRoot ? this.ROOT : '';
        const fileFullName = fileName + extension;
        const finalDir = rootStoreDir + directoryPath + fileFullName;

        if (!this.isDirectoryExist(rootStoreDir + directoryPath)) {
            if (isForcing) {
                // @ts-ignore
                this.fs.mkdirSync(rootStoreDir + directoryPath, { recursive: true });
            } else {
                return this.promiseReturn(null, 'File or Directory is not existed', false);
            }
        }

        const writePromises = this.util.promisify(this.fs.writeFile);
        const writeDataStatus = this.parsingData(data, extension);
        if (!writeDataStatus.valid) {
            return this.promiseReturn(null, writeDataStatus.data, false);
        }
        return writePromises(finalDir, writeDataStatus.data);
    }

    fileList(dir, excludeDirs?): string[] {
        const _ = this;
        return this.fs.readdirSync(dir).reduce(function (list, file) {
            const name = _.path.join(dir, file);
            if (_.fs.statSync(name).isDirectory()) {
                if (excludeDirs && excludeDirs.length) {
                    excludeDirs = excludeDirs.map(d => _.path.normalize(d));
                    const idx = name.indexOf(_.path.sep);
                    const directory = name.slice(0, idx === -1 ? name.length : idx);
                    if (excludeDirs.indexOf(directory) !== -1) {
                        return list;
                    }
                }
                return list.concat(_.fileList(name, excludeDirs));
            }
            return list.concat([name]);
        }, []);
    }

    private parsingData(data: object | string, extension: '.txt' | '.json'): { valid: boolean, data: string } {
        let writeData = '';
        if (extension === '.txt') {
            if (typeof data !== 'string') {
                writeData = JSON.stringify(data);
            }
        } else {
            if (typeof data !== 'object' || (typeof data === 'object' && Array.isArray(data))) {
                return {
                    valid: false,
                    data: 'Trying to write non-object data to .json file, which is impossible!'
                };
            }
            writeData = JSON.stringify(data);
        }
        return {
            valid: true,
            data: writeData
        };
    }

    private promiseReturn(value: any, message: string, status: boolean = true): Promise<{ status: boolean, message: string, value: any }> {
        if (status) {
            return new Promise((resolve, reject) => resolve({
                status: status,
                message: message, // for debugging purpose
                value: value
            }));
        } else {
            return new Promise((resolve, reject) => reject({
                status: status,
                message: message, // for debugging purpose
                value: value
            }));
        }
    }
}
